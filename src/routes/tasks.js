// src/routes/tasks.js (server side)

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const Joi = require('joi');

const taskSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(''),
  priority: Joi.string().valid('Low', 'Medium', 'High').required(),
  project: Joi.string().required(),
  order: Joi.number()
});

// Create a new task
router.post('/', auth, async (req, res) => {
  try {
    const { error } = taskSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { title, description, priority, project } = req.body;
    const newTask = new Task({
      title,
      description,
      priority,
      project,
      user: req.user.id
    });
    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all tasks for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId, user: req.user.id }).sort('order');
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update a task
router.put('/:id', auth, async (req, res) => {
  try {
    const { error } = taskSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { title, description, priority, project, order } = req.body;
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (task.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
    
    task.title = title || task.title;
    task.description = description || task.description;
    task.priority = priority || task.priority;
    task.project = project || task.project;
    task.order = order !== undefined ? order : task.order;
    task.updatedAt = Date.now();

    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Reorder tasks
router.put('/reorder/:projectId', auth, async (req, res) => {
  try {
    const { taskIds } = req.body;
    const projectId = req.params.projectId;

    // Validate input
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'Invalid taskIds provided' });
    }

    // Update task orders
    const bulkOps = taskIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, project: projectId, user: req.user.id },
        update: { $set: { order: index } }
      }
    }));

    await Task.bulkWrite(bulkOps);

    // Fetch updated tasks
    const updatedTasks = await Task.find({ project: projectId, user: req.user.id }).sort('order');

    res.json(updatedTasks);
  } catch (err) {
    console.error('Error reordering tasks:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Move a task to a different project
router.put('/:id/move', auth, async (req, res) => {
  try {
    const { newProjectId } = req.body;
    const taskId = req.params.id;

    // Validate input
    if (!newProjectId) {
      return res.status(400).json({ message: 'New project ID is required' });
    }

    // Check if the task exists and belongs to the user
    const task = await Task.findOne({ _id: taskId, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if the new project exists and belongs to the user
    const newProject = await Project.findOne({ _id: newProjectId, user: req.user.id });
    if (!newProject) {
      return res.status(404).json({ message: 'New project not found' });
    }

    // Update the task's project
    task.project = newProjectId;
    await task.save();

    res.json(task);
  } catch (err) {
    console.error('Error moving task:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Delete a task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    await task.remove();
    res.json({ msg: 'Task removed', id: req.params.id });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Task not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
