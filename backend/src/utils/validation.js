const Joi = require('joi');

const schemas = {
  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(255).required(),
    referral_code: Joi.string().max(50).optional().allow('', null),
    vehicle_registration: Joi.string().max(20).optional().allow('', null),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createPlace: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(2000).optional().allow(null, ''),
    address: Joi.string().optional().allow(null, ''),
    city: Joi.string().optional().allow(null, ''),
    country: Joi.string().optional().allow(null, ''),
    postal_code: Joi.string().optional().allow(null, ''),
    latitude: Joi.number().min(-90).max(90).optional().allow(null),
    longitude: Joi.number().min(-180).max(180).optional().allow(null),
    price_per_night: Joi.number().min(0).optional().allow(null),
    capacity: Joi.number().integer().min(0).optional().allow(null),
    amenities: Joi.array().items(Joi.string()).optional(),
    approval_status: Joi.string().valid('draft', 'pending', 'approved', 'rejected').optional(),
    place_type: Joi.string().valid('private_land', 'pub', 'campsite', 'farm').optional(),
    opening_hours: Joi.string().max(100).optional().allow(null, ''),
    kitchen_hours: Joi.string().max(100).optional().allow(null, ''),
    food_menu_description: Joi.string().max(2000).optional().allow(null, ''),
    serves_food: Joi.boolean().optional(),
    business_description: Joi.string().max(2000).optional().allow(null, ''),
    access_route_description: Joi.string().max(2000).optional().allow(null, ''),
    max_vehicle_height_ft: Joi.number().min(0).max(20).optional().allow(null),
    max_vehicle_width_ft: Joi.number().min(0).max(15).optional().allow(null),
    max_vehicle_length_ft: Joi.number().min(0).max(50).optional().allow(null),
    owner_id: Joi.number().integer().optional(),
  }).unknown(true),

  createBooking: Joi.object({
    place_id: Joi.number().integer(),
    pub_id: Joi.number().integer(),
    check_in_date: Joi.date().iso().required(),
    check_out_date: Joi.date().iso().required(),
    check_in_time: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    check_out_time: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    van_registration: Joi.string().required().pattern(
      /^[A-Za-z0-9][A-Za-z0-9 \-]{0,13}[A-Za-z0-9]$/,
      'European number plate'
    ).messages({
      'any.required': 'Van registration is required',
      'string.pattern.name': 'Please enter a valid number plate (2-15 characters, letters, digits, spaces or hyphens)',
    }),
    contact_phone: Joi.string(),
    special_requests: Joi.string().max(1000),
    payment_intent_id: Joi.string().optional(),
    paymentIntentId: Joi.string().optional(),
    total_price: Joi.number().optional(),
  }),

  createReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(255),
    comment: Joi.string().max(2000),
    photo_urls: Joi.array().items(Joi.string().uri()).max(5),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(255),
    bio: Joi.string().max(500).allow('', null),
    phone_number: Joi.string().allow('', null),
    vehicle_registration: Joi.string().max(20).allow('', null),
    vehicle_length: Joi.number().positive().allow(null),
    vehicle_height: Joi.number().positive().allow(null),
    vehicle_width: Joi.number().positive().allow(null),
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
