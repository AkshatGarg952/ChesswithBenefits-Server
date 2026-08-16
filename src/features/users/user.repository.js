import User from './user.schema.js';
import bcrypt from 'bcrypt';
import { AppError } from '../../utils/appError.js';

const SALT_ROUNDS = 12;

export default class UserRepository {
  async register(user) {
    const existing = await User.findOne({ $or: [{ email: user.email }, { username: user.username }] });
    if (existing) {
      const conflictField = existing.email === user.email ? 'email' : 'username';
      throw new AppError(`An account with this ${conflictField} already exists.`, 409);
    }

    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    const newUser = new User({ ...user, password: hashedPassword });
    return newUser.save();
  }

  async login(email, password) {
    const user = await User.findOne({ email });
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    return user;
  }

  async details(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    return user;
  }

  async update(id, updates) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    Object.assign(user, updates);
    return user.save();
  }
}
