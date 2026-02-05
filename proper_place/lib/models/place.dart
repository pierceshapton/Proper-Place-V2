class Place {
  final String placeId;
  final String name;
  final String description;
  final double locationLat;
  final double locationLng;
  final String address;
  final double pricePerNight;
  final String? imageUrl;
  final List<String> imageUrls; // Multiple images for swiper
  final String? placeType;
  final String? amenities;
  final String? hostName;
  final String? hostEmail;
  final String approvalStatus;
  final int capacity;

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
    this.capacity = 1,
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
    
    return Place(
      placeId: json['place_id'] ?? '',
      name: json['name'] ?? 'Unnamed',
      description: json['description'] ?? '',
      locationLat: double.tryParse(json['location_lat'].toString()) ?? 0,
      locationLng: double.tryParse(json['location_lng'].toString()) ?? 0,
      address: json['address'] ?? '',
      pricePerNight: double.tryParse(json['price_per_night'].toString()) ?? 0,
      imageUrl: json['image_url'],
      imageUrls: images,
      placeType: json['place_type'],
      amenities: json['amenities'],
      hostName: json['host_name'],
      hostEmail: json['host_email'],
      approvalStatus: json['approval_status'] ?? 'pending',
      capacity: json['capacity'] ?? 1,
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
      'capacity': capacity,
    };
  }
}
