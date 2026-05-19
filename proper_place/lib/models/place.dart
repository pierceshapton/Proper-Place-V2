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
  final int? hostId;
  final String? hostName;
  final String? hostEmail;
  final String approvalStatus;
  final String status;
  final bool isCurrentlyUnavailable; // True if place has active unavailable period (date range)
  final int capacity;
  final double? maxVehicleHeightFt;
  final double? maxVehicleWidthFt;
  final double? maxVehicleLengthFt;
  final List<String> amenitiesList;
  final String? businessDescription;
  final String? accessRouteDescription;
  final String? openingHours;
  final String? kitchenHours;
  final String? foodMenuDescription;
  final String? hostContractAcceptedAt;
  final String? hostContractVersion;
  final int? maxNightsPerStay;
  final List<int> availableDays; // 1=Mon … 7=Sun; empty means all days allowed
  final bool electricHookupAvailable;
  final int? electricHookupCapacity;
  final double? electricHookupPricePerNight;

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
    this.hostId,
    this.hostName,
    this.hostEmail,
    this.approvalStatus = 'approved',
    this.status = 'available',
    this.isCurrentlyUnavailable = false,
    this.capacity = 1,
    this.maxVehicleHeightFt,
    this.maxVehicleWidthFt,
    this.maxVehicleLengthFt,
    this.amenitiesList = const [],
    this.businessDescription,
    this.accessRouteDescription,
    this.openingHours,
    this.kitchenHours,
    this.foodMenuDescription,
    this.hostContractAcceptedAt,
    this.hostContractVersion,
    this.maxNightsPerStay,
    this.availableDays = const [],
    this.electricHookupAvailable = false,
    this.electricHookupCapacity,
    this.electricHookupPricePerNight,
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
      hostId: int.tryParse((json['owner_id'] ?? '').toString()),
      hostName: toStringOrNull(json['host_name']),
      hostEmail: toStringOrNull(json['host_email']),
      approvalStatus: json['approval_status'] ?? 'pending',
      status: json['status'] ?? 'available',
      isCurrentlyUnavailable: json['is_currently_unavailable'] == true,
      capacity: json['capacity'] ?? 1,
      maxVehicleHeightFt: double.tryParse((json['max_vehicle_height_ft'] ?? '').toString()),
      maxVehicleWidthFt: double.tryParse((json['max_vehicle_width_ft'] ?? '').toString()),
      maxVehicleLengthFt: double.tryParse((json['max_vehicle_length_ft'] ?? '').toString()),
      amenitiesList: json['amenities'] is List
          ? List<String>.from(json['amenities'])
          : (json['amenities'] is String && json['amenities'].toString().isNotEmpty)
              ? json['amenities'].toString().split(', ')
              : [],
      businessDescription: toStringOrNull(json['business_description']),
      accessRouteDescription: toStringOrNull(json['access_route_description']),
      openingHours: toStringOrNull(json['opening_hours']),
      kitchenHours: toStringOrNull(json['kitchen_hours']),
      foodMenuDescription: toStringOrNull(json['food_menu_description']),
      hostContractAcceptedAt: toStringOrNull(json['host_contract_accepted_at']),
      hostContractVersion: toStringOrNull(json['host_contract_version']),
      maxNightsPerStay: json['max_nights_per_stay'] != null
          ? int.tryParse(json['max_nights_per_stay'].toString())
          : null,
      availableDays: json['available_days'] is List
          ? List<int>.from(
              (json['available_days'] as List).map((d) => int.tryParse(d.toString()) ?? 0).where((d) => d > 0))
          : const [],
      electricHookupAvailable: json['electric_hookup_available'] == true,
      electricHookupCapacity: json['electric_hookup_capacity'] != null
          ? int.tryParse(json['electric_hookup_capacity'].toString())
          : null,
      electricHookupPricePerNight: json['electric_hookup_price_per_night'] != null
          ? double.tryParse(json['electric_hookup_price_per_night'].toString())
          : null,
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
      'owner_id': hostId,
      'host_name': hostName,
      'host_email': hostEmail,
      'approval_status': approvalStatus,
      'status': status,
      'is_currently_unavailable': isCurrentlyUnavailable,
      'capacity': capacity,
      'max_vehicle_height_ft': maxVehicleHeightFt,
      'max_vehicle_width_ft': maxVehicleWidthFt,
      'max_vehicle_length_ft': maxVehicleLengthFt,
      'business_description': businessDescription,
      'access_route_description': accessRouteDescription,
      'opening_hours': openingHours,
      'kitchen_hours': kitchenHours,
      'food_menu_description': foodMenuDescription,
      'electric_hookup_available': electricHookupAvailable,
      if (electricHookupCapacity != null) 'electric_hookup_capacity': electricHookupCapacity,
      if (electricHookupPricePerNight != null) 'electric_hookup_price_per_night': electricHookupPricePerNight,
    };
  }
}
