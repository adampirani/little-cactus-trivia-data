/**
 * @module times/controller.js
 * This is only used as an example of how to leverage
 * environment variables from .env
 */
const routes = ['/times'];

const controller = (req, res) => {
  let result = '';
  const times = process.env.TIMES || 5;
  for (let i = 0; i < times; i++) {
    result += i + ' ';
  }
  res.send(result);
};

module.exports = {
  controller,
  routes
};
