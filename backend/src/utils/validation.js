const Joi = require('joi');

const schemas = {
  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(255).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createPlace: Joi.object({
    name: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000),
    address: Joi.string().required(),
    city: Joi.string().required(),
    country: Joi.string().required(),
    postal_code: Joi.string(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    price_per_night: Joi.number().positive(),
    capacity: Joi.number().positive().integer(),
    amenities: Joi.array().items(Joi.string()),
  }),

  createBooking: Joi.object({
    place_id: Joi.number().integer(),
    pub_id: Joi.number().integer(),
    check_in_date: Joi.date().iso().required(),
    check_out_date: Joi.date().iso().required(),
    van_registration: Joi.string(),
    contact_phone: Joi.string(),
    special_requests: Joi.string().max(1000),
  }),

  createReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(255),
    comment: Joi.string().max(2000),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(255),
    bio: Joi.string().max(500),
    phone_number: Joi.string(),
    vehicle_registration: Joi.string(),
    vehicle_length: Joi.number().positive(),
    vehicle_height: Joi.number().positive(),
    vehicle_width: Joi.number().positive(),
    dark_mode: Joi.boolean(),
    offline_mode: Joi.boolean(),
  }),
};

/**
 * Validate request body
 */
function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return { valid: false, details };
  }

  return { valid: true, data: value };
}

module.exports = {
  schemas,
  validate,
};
