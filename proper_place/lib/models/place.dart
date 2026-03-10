import '../config/app_config.dart';

class Place {
  final String placeId;
  final String name;
  final String description;
  final double locationLat;
  final double locationLng;
  final String address;
  final double pricePerNight;
  final String? imageUrl;
  final List<String> imageUrls;

  /// Helper to convert relative image URL to full URL
  static String? toFullImageUrl(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('http')) return url;
    return '${AppConfig.properPlaceBackendUrl}$url';
  }

  /// Helper for lists of image URLs
  static List<String> toFullImageUrls(List<String> urls) {
    return urls.map((url) => toFullImageUrl(url) ?? '').where((url) => url.isNotEmpty).toList();
  } // Multiple images for swiper
  final String? placeType;
  final String? amenities;
  final String? hostName;
  final String? hostEmail;
  final String approvalStatus;
  final String status;
  final bool isCurrentlyUnavailable; // True if place has active unavailable period (date range)
  final int capacity;
  final double? maxVehicleHeightFt;
  final double? maxVehicleWidthFt;
  final double? maxVehicleLengthFt;

  Place({
    required this.placeId,
    required this.name,
    required this.description,
    required this.locationLat,
    required this.locationLng,
    required this.address,
    required this.pricePerNight,
    this.imageUrl,
    this.imageUrls = const [],
    this.placeType,
    this.amenities,
    this.hostName,
    this.hostEmail,
    this.approvalStatus = 'approved',
    this.status = 'available',
    this.isCurrentlyUnavailable = false,
    this.capacity = 1,
    this.maxVehicleHeightFt,
    this.maxVehicleWidthFt,
    this.maxVehicleLengthFt,
  });

  factory Place.fromJson(Map<String, dynamic> json) {
    // Parse imageUrls - can be a list or a string (main image)
    List<String> images = [];
    if (json['image_urls'] is List) {
      images = List<String>.from(json['image_urls'] ?? []);
    }
    // If no image_urls but there's an image_url, use that as the first image
    if (images.isEmpty && json['image_url'] != null) {
      images = [json['image_url']];
    }
    
    // Helper to safely convert to String (handles List, String, or null)
    String? toStringOrNull(dynamic value) {
      if (value == null) return null;
      if (value is String) return value;
      if (value is List) return value.isNotEmpty ? value.join(', ') : null;
      return value.toString();
    }
    
    return Place(
      placeId: (json['place_id'] ?? json['id'] ?? '').toString(),
      name: json['name'] ?? 'Unnamed',
      description: json['description'] ?? '',
      locationLat: double.tryParse((json['location_lat'] ?? json['latitude'] ?? 0).toString()) ?? 0,
      locationLng: double.tryParse((json['location_lng'] ?? json['longitude'] ?? 0).toString()) ?? 0,
      address: json['address'] ?? '',
      pricePerNight: double.tryParse(json['price_per_night'].toString()) ?? 0,
      imageUrl: toFullImageUrl(toStringOrNull(json['image_url'])),
      imageUrls: toFullImageUrls(images),
      placeType: toStringOrNull(json['place_type']),
      amenities: toStringOrNull(json['amenities']),
      hostName: toStringOrNull(json['host_name']),
      hostEmail: toStringOrNull(json['host_email']),
      approvalStatus: json['approval_status'] ?? 'pending',
      status: json['status'] ?? 'available',
      isCurrentlyUnavailable: json['is_currently_unavailable'] == true,
      capacity: json['capacity'] ?? 1,
      maxVehicleHeightFt: double.tryParse((json['max_vehicle_height_ft'] ?? '').toString()),
      maxVehicleWidthFt: double.tryParse((json['max_vehicle_width_ft'] ?? '').toString()),
      maxVehicleLengthFt: double.tryParse((json['max_vehicle_length_ft'] ?? '').toString()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'place_id': placeId,
      'name': name,
      'description': description,
      'location_lat': locationLat,
      'location_lng': locationLng,
      'address': address,
      'price_per_night': pricePerNight,
      'image_url': imageUrl,
      'image_urls': imageUrls,
      'place_type': placeType,
      'amenities': amenities,
      'host_name': hostName,
      'host_email': hostEmail,
      'approval_status': approvalStatus,
      'status': status,
      'is_currently_unavailable': isCurrentlyUnavailable,
      'capacity': capacity,
      'max_vehicle_height_ft': maxVehicleHeightFt,
      'max_vehicle_width_ft': maxVehicleWidthFt,
      'max_vehicle_length_ft': maxVehicleLengthFt,
    };
  }
}
