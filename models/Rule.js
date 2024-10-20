
const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  ruleString: String,  
  ast: Object,       
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Rule', ruleSchema);
