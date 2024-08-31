const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');

router.get('/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, user: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const tasks = await Task.find({ project: req.params.projectId });
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, user: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const newTask = new Task({
      name: req.body.name,
      project: req.params.projectId
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.put('/:taskId', auth, async (req, res) => {
  try {
    let task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findOne({ _id: task.project, user: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    task.name = req.body.name || task.name;
    task.completed = req.body.completed !== undefined ? req.body.completed : task.completed;
    task.subtasks = req.body.subtasks || task.subtasks;

    task = await task.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
