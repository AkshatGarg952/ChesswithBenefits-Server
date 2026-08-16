import mongoose from 'mongoose';

export const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[paramName])) {
    return res.status(400).json({ message: `Invalid ${paramName}.` });
  }
  next();
};
