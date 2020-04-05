const routes = ['/'];

const controller = (req, res) => {
  res.render('pages/index');
};

module.exports = {
  controller,
  routes
};
