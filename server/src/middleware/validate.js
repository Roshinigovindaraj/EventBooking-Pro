export const validate = schema => (req, _res, next) => {
  try {
    const result = schema.parse({ body: req.body, params: req.params, query: req.query });
    Object.assign(req, result);
    next();
  } catch (error) {
    next(error);
  }
};

