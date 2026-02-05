import { query } from '../db/database.js';

export class PlacesService {
  // Get all approved places (for guests)
  static async getApprovedPlaces() {
    const result = await query(
      `SELECT place_id, name, description, location_lat, location_lng, address, 
              price_per_night, image_url, place_type, amenities
       FROM places 
       WHERE approval_status = 'approved' 
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Get approved places within bounding box (for map)
  static async getPlacesInBounds(minLat, maxLat, minLng, maxLng) {
    const result = await query(
      `SELECT place_id, name, description, location_lat, location_lng, address, 
              price_per_night, image_url, place_type, amenities
       FROM places 
       WHERE approval_status = 'approved'
       AND location_lat BETWEEN $1 AND $2
       AND location_lng BETWEEN $3 AND $4
       ORDER BY created_at DESC`,
      [minLat, maxLat, minLng, maxLng]
    );
    return result.rows;
  }

  // Get single place details
  static async getPlaceById(placeId) {
    const result = await query(
      `SELECT p.*, u.name as host_name, u.email as host_email
       FROM places p
       JOIN users u ON p.host_id = u.user_id
       WHERE p.place_id = $1 AND p.approval_status = 'approved'`,
      [placeId]
    );
    if (result.rows.length === 0) {
      throw new Error('Place not found');
    }
    return result.rows[0];
  }

  // Submit new place (by host)
  static async submitPlace(hostId, placeData) {
    const {
      name,
      description,
      locationLat,
      locationLng,
      address,
      pricePerNight,
      imageUrl,
      placeType,
      amenities,
    } = placeData;

    const result = await query(
      `INSERT INTO places 
       (host_id, name, description, location_lat, location_lng, address, 
        price_per_night, image_url, place_type, amenities, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING place_id, name, approval_status, submitted_at`,
      [
        hostId,
        name,
        description,
        locationLat,
        locationLng,
        address,
        pricePerNight,
        imageUrl,
        placeType,
        amenities,
      ]
    );

    return result.rows[0];
  }

  // Get host's places
  static async getHostPlaces(hostId) {
    const result = await query(
      `SELECT place_id, name, approval_status, address, price_per_night, 
              location_lat, location_lng, submitted_at, approved_at
       FROM places 
       WHERE host_id = $1 
       ORDER BY submitted_at DESC`,
      [hostId]
    );
    return result.rows;
  }

  // Get pending places (for admin)
  static async getPendingPlaces() {
    const result = await query(
      `SELECT p.*, u.name as host_name, u.email as host_email
       FROM places p
       JOIN users u ON p.host_id = u.user_id
       WHERE p.approval_status = 'pending'
       ORDER BY p.submitted_at ASC`
    );
    return result.rows;
  }

  // Approve place (admin only)
  static async approvePlace(placeId, adminId, notes = '') {
    const result = await query(
      `UPDATE places 
       SET approval_status = 'approved', 
           approved_at = CURRENT_TIMESTAMP,
           approved_by = $1,
           admin_notes = $2
       WHERE place_id = $3
       RETURNING place_id, name, approval_status`,
      [adminId, notes, placeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Place not found');
    }

    return result.rows[0];
  }

  // Reject place (admin only)
  static async rejectPlace(placeId, adminId, reason) {
    const result = await query(
      `UPDATE places 
       SET approval_status = 'rejected', 
           approved_at = CURRENT_TIMESTAMP,
           approved_by = $1,
           admin_notes = $2
       WHERE place_id = $3
       RETURNING place_id, name, approval_status`,
      [adminId, reason, placeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Place not found');
    }

    return result.rows[0];
  }
}
