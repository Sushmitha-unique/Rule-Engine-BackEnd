const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ruleRoutes = require('./routes/ruleRoutes');
const app = express();
const PORT = 5000;
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json());
mongoose.connect('mongodb://localhost:27017/rule-engine', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error: ', err));
app.use('/api', ruleRoutes);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
