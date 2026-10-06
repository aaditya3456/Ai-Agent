import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { successResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError('An account with this email address already exists.', 409, 'AUTH_USER_EXISTS'));
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    const token = generateToken(user._id);

    return successResponse(
      res,
      201,
      'Registration successful',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      }
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS'));
    }

    const token = generateToken(user._id);

    return successResponse(
      res,
      200,
      'Login successful',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      }
    );
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const [resumeCount, jobCount, applicationCount] = await Promise.all([
      Resume.countDocuments({ userId: req.user._id }),
      Job.countDocuments({ userId: req.user._id }),
      Application.countDocuments({ userId: req.user._id }),
    ]);

    return successResponse(
      res,
      200,
      'Current user profile',
      {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          createdAt: req.user.createdAt,
          stats: {
            resumes: resumeCount,
            jobs: jobCount,
            applications: applicationCount,
          },
        },
      }
    );
  } catch (error) {
    next(error);
  }
};
