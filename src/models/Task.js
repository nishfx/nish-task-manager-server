const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  completed: { type: Boolean, default: false },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  subtasks: [subtaskSchema]
});

module.exports = mongoose.model('Task', taskSchema);
