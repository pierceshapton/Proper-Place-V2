import 'package:flutter/material.dart';
import 'dart:io';
import '../services/storage_service.dart';
import '../services/image_picker_service.dart';
import '../services/place_service.dart';
import '../services/google_places_service.dart';
import '../services/api_service.dart';
import '../config/app_config.dart';

class HostCreateSiteScreen extends StatefulWidget {
  final Map<String, dynamic>? siteToEdit;

  const HostCreateSiteScreen({super.key, this.siteToEdit});

  @override
  State<HostCreateSiteScreen> createState() => _HostCreateSiteScreenState();
}

class _HostCreateSiteScreenState extends State<HostCreateSiteScreen> {
  late TextEditingController addressController;
  late TextEditingController descriptionController;
  late TextEditingController priceController;
  late TextEditingController websiteController;
  late TextEditingController businessNameController;
  late TextEditingController foodMenuController;
  late TextEditingController businessDescriptionController;

  File? mainPhotoFile;
  List<File> supportingPhotos = [];
  List<File> businessPhotos = [];
  
  // Existing image URLs from backend (when editing)
  String? existingMainPhotoUrl;
  List<String> existingSupportingUrls = [];
  List<String> existingBusinessUrls = [];

  double maxVehicleLength = 30.0; // Default 30ft
  double maxVehicleHeight = 12.0; // Default 12ft
  double maxVehicleWidth = 8.0; // Default 8ft
  bool vehicleDimensionsConfirmed = false; // Track if host confirmed dimensions
  bool isSavingDraft = false;
  bool isSubmitting = false;
  
  // Focus node for price field keyboard toolbar
  final FocusNode _priceFocusNode = FocusNode();

  // Location type and pub-specific fields
  String selectedLocationType = 'private_land';
  final List<String> locationTypes = [
    'private_land',
    'pub',
    'farm',
    'car_park',
    'business',
    'other',
  ];
  final Map<String, String> locationTypeLabels = {
    'private_land': 'Private Land',
    'pub': 'Pub / Restaurant',
    'farm': 'Farm',
    'car_park': 'Car Park',
    'business': 'Business Parking',
    'other': 'Other',
  };

  // Pub-specific fields
  TimeOfDay? pubOpenTime;
  TimeOfDay? pubCloseTime;
  TimeOfDay? kitchenOpenTime;
  TimeOfDay? kitchenCloseTime;

  // Address autocomplete
  List<PlacePrediction> addressSuggestions = [];
  bool showAddressSuggestions = false;
  bool addressVerified = false; // Track if address was selected from Google Places
  TextEditingController searchAddressController = TextEditingController(); // Separate controller for typing
  double latitude = 51.4545; // Default Bristol
  double longitude = -2.5879; // Default Bristol
  String city = 'Bristol';
  String country = 'UK';

  List<String> facilities = [];
  bool facilitiesLoading = true;

  Map<String, bool> selectedFacilities = {};

  @override
  void initState() {
    super.initState();
    addressController = TextEditingController();
    descriptionController = TextEditingController();
    priceController = TextEditingController();
    websiteController = TextEditingController();
    businessNameController = TextEditingController();
    foodMenuController = TextEditingController();
    businessDescriptionController = TextEditingController();
    
    _priceFocusNode.addListener(_onPriceFocusChange);

    // Load facilities first, then site data (to avoid race condition)
    _fetchFacilities().then((_) {
      if (widget.siteToEdit != null) {
        _loadExistingSite();
      } else {
        _loadDraft();
      }
    });
  }

  Future<void> _fetchFacilities() async {
    try {
      final response = await ApiService.getFacilities();
      if (mounted) {
        setState(() {
          facilities = response;
          selectedFacilities = {
            for (var facility in facilities) facility: false
          };
          facilitiesLoading = false;
        });
      }
    } catch (e) {
      print('Error fetching facilities: $e');
      // Fallback to defaults if API fails
      setState(() {
        facilities = [
          'WiFi',
          'Electricity Hookup',
          'Drinking water fill up point',
          'Chemical toilet disposal point',
          'Grey water disposal point',
          'Waste recycling point',
          'Restaurant/Pub',
        ];
        selectedFacilities = {
          for (var facility in facilities) facility: false
        };
        facilitiesLoading = false;
      });
    }
  }

  Future<void> _loadExistingSite() async {
    final site = widget.siteToEdit!;
    
    // Debug: Print full site data to identify image field
    print('DEBUG _loadExistingSite: Full site data keys: ${site.keys.toList()}');
    print('DEBUG _loadExistingSite: images field type: ${site['images']?.runtimeType}');
    print('DEBUG _loadExistingSite: images field value: ${site['images']}');
    print('DEBUG _loadExistingSite: business_images field: ${site['business_images']}');
    
    // Process images BEFORE setState to catch any errors
    List<String>? images;
    String? mainPhotoUrl;
    List<String> supportingUrls = [];
    List<String> businessUrls = [];
    
    try {
      // Load site images (main + supporting)
      if (site['images'] != null && site['images'] is List && (site['images'] as List).isNotEmpty) {
        images = List<String>.from(site['images']);
        print('DEBUG: Found images field with ${images.length} images: $images');
      } else if (site['image_urls'] != null && site['image_urls'] is List && (site['image_urls'] as List).isNotEmpty) {
        images = List<String>.from(site['image_urls']);
        print('DEBUG: Found image_urls field with ${images.length} images: $images');
      } else {
        print('DEBUG: No site images found');
      }
      
      if (images != null && images.isNotEmpty) {
        mainPhotoUrl = _toFullImageUrl(images.first);
        print('DEBUG: Computed mainPhotoUrl: $mainPhotoUrl');
        if (images.length > 1) {
          supportingUrls = images.sublist(1).map((url) => _toFullImageUrl(url)).toList();
          print('DEBUG: Computed supportingUrls: $supportingUrls');
        }
      }
      
      // Load business images separately
      if (site['business_images'] != null && site['business_images'] is List && (site['business_images'] as List).isNotEmpty) {
        businessUrls = List<String>.from(site['business_images']).map((url) => _toFullImageUrl(url)).toList();
        print('DEBUG: Computed businessUrls: $businessUrls');
      } else {
        print('DEBUG: No business images found');
      }
    } catch (e) {
      print('DEBUG ERROR loading images: $e');
    }
    
    setState(() {
      // Map backend field names to form fields
      addressController.text = site['address'] ?? '';
      descriptionController.text = site['description'] ?? '';
      priceController.text = site['price_per_night']?.toString() ?? '';
      websiteController.text = site['website_url'] ?? site['website'] ?? '';
      businessNameController.text = site['name'] ?? site['business_name'] ?? '';
      businessDescriptionController.text = site['business_description'] ?? '';
      foodMenuController.text = site['food_menu_description'] ?? '';
      maxVehicleLength = _parseDouble(site['max_vehicle_length_ft'] ?? site['capacity'] ?? site['max_vehicle_length'], 30);
      maxVehicleHeight = _parseDouble(site['max_vehicle_height_ft'], 12);
      maxVehicleWidth = _parseDouble(site['max_vehicle_width_ft'], 8);
      vehicleDimensionsConfirmed = true; // Already set when editing
      
      // Load location data
      city = site['city'] ?? '';
      country = site['country'] ?? '';
      latitude = _parseDouble(site['latitude'], 0);
      longitude = _parseDouble(site['longitude'], 0);
      
      // Load place type
      if (site['place_type'] != null) {
        selectedLocationType = site['place_type'];
      }
      
      // Load pub-specific fields
      if (site['opening_hours'] != null && site['opening_hours'].toString().isNotEmpty) {
        final times = _parseTimeRange(site['opening_hours']);
        if (times != null) {
          pubOpenTime = times['start'];
          pubCloseTime = times['end'];
        }
      }
      if (site['kitchen_hours'] != null && site['kitchen_hours'].toString().isNotEmpty) {
        final times = _parseTimeRange(site['kitchen_hours']);
        if (times != null) {
          kitchenOpenTime = times['start'];
          kitchenCloseTime = times['end'];
        }
      }

      // Load amenities/facilities
      if (site['amenities'] != null) {
        final facilitiesList = List<String>.from(site['amenities']);
        for (var facility in facilitiesList) {
          if (selectedFacilities.containsKey(facility)) {
            selectedFacilities[facility] = true;
          }
        }
      } else if (site['selected_facilities'] != null) {
        final facilitiesList = List<String>.from(site['selected_facilities']);
        for (var facility in facilitiesList) {
          if (selectedFacilities.containsKey(facility)) {
            selectedFacilities[facility] = true;
          }
        }
      }
      
      // Set pre-computed image URLs
      existingMainPhotoUrl = mainPhotoUrl;
      existingSupportingUrls = supportingUrls;
      existingBusinessUrls = businessUrls;
      print('DEBUG setState: existingMainPhotoUrl = $existingMainPhotoUrl');
      print('DEBUG setState: existingBusinessUrls = $existingBusinessUrls');
      
      // Mark address as verified so it displays correctly when editing
      addressVerified = addressController.text.isNotEmpty;
    });
  }

  /// Transform relative image URL to full URL
  String _toFullImageUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${AppConfig.properPlaceBackendUrl}$url';
  }

  /// Parse a value to double, handling String, int, double, or null
  double _parseDouble(dynamic value, double defaultValue) {
    if (value == null) return defaultValue;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      return double.tryParse(value) ?? defaultValue;
    }
    return defaultValue;
  }

  Future<void> _loadDraft() async {
    try {
      final draftJson = await StorageService.getString('site_draft');
      if (draftJson != null && mounted) {
        // Parse and load draft data
      }
    } catch (e) {
      print('Error loading draft: $e');
    }
  }

  Future<void> _saveDraft() async {
    // Check if at least one field has been filled
    final hasAnyData = businessNameController.text.isNotEmpty ||
        addressController.text.isNotEmpty ||
        descriptionController.text.isNotEmpty ||
        priceController.text.isNotEmpty ||
        websiteController.text.isNotEmpty ||
        businessDescriptionController.text.isNotEmpty ||
        selectedFacilities.values.any((v) => v) ||
        foodMenuController.text.isNotEmpty ||
        mainPhotoFile != null ||
        supportingPhotos.isNotEmpty ||
        businessPhotos.isNotEmpty;

    if (!hasAnyData) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in at least one field to save draft')),
      );
      return;
    }

    setState(() => isSavingDraft = true);
    try {
      final siteData = _buildDraftData();
      siteData['approval_status'] = 'draft';

      final isEditing = widget.siteToEdit != null;
      int placeId;
      
      if (isEditing) {
        // Update existing draft
        placeId = widget.siteToEdit!['id'];
        await PlaceService.updatePlace(placeId, siteData);
      } else {
        // Create new draft
        final createdPlace = await PlaceService.createPlace(siteData);
        placeId = createdPlace['place']?['id'] ?? createdPlace['id'];
      }
      
      // Upload site photos (main + supporting) separately from business photos
      final sitePhotos = <File>[];
      if (mainPhotoFile != null) sitePhotos.add(mainPhotoFile!);
      sitePhotos.addAll(supportingPhotos);
      
      if (sitePhotos.isNotEmpty) {
        await PlaceService.uploadPlacePhotos(placeId, sitePhotos, category: 'site');
      }
      
      // Upload business photos separately
      if (businessPhotos.isNotEmpty) {
        await PlaceService.uploadPlacePhotos(placeId, businessPhotos, category: 'business');
      }
      
      // Clear local draft storage
      await StorageService.removeString('site_draft');

      if (mounted) {
        // Return to sites tab with refresh flag
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving draft: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => isSavingDraft = false);
      }
    }
  }

  Future<void> _deleteDraft() async {
    // Confirm deletion
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Draft'),
        content: const Text('Are you sure you want to delete this draft? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final placeId = widget.siteToEdit!['id'];
      await PlaceService.deletePlace(placeId);
      
      if (mounted) {
        Navigator.pop(context, true); // Return with refresh flag
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error deleting draft: $e')),
        );
      }
    }
  }

  // Build draft data with defaults for required fields
  Map<String, dynamic> _buildDraftData() {
    final data = {
      'name': businessNameController.text.isNotEmpty ? businessNameController.text : 'Untitled Draft',
      'address': addressController.text.isNotEmpty ? addressController.text : 'Address pending',
      'description': descriptionController.text.isNotEmpty ? descriptionController.text : 'Draft - description pending',
      'price_per_night': double.tryParse(priceController.text) ?? 0,
      'city': city.isNotEmpty ? city : 'Unknown',
      'country': country.isNotEmpty ? country : 'UK',
      'latitude': latitude != 0 ? latitude : 51.5074, // Default to London
      'longitude': longitude != 0 ? longitude : -0.1278,
      'capacity': maxVehicleLength.toInt(),
      'max_vehicle_height_ft': maxVehicleHeight,
      'max_vehicle_width_ft': maxVehicleWidth,
      'max_vehicle_length_ft': maxVehicleLength,
      'amenities': selectedFacilities.entries.where((e) => e.value).map((e) => e.key).toList(),
      'place_type': selectedLocationType,
    };

    // Add pub-specific data if location type is pub
    if (selectedLocationType == 'pub') {
      data['opening_hours'] = _formatTimeRange(pubOpenTime, pubCloseTime);
      data['kitchen_hours'] = _formatTimeRange(kitchenOpenTime, kitchenCloseTime);
      data['food_menu_description'] = foodMenuController.text;
    }

    // Add business description if provided
    if (businessDescriptionController.text.isNotEmpty) {
      data['business_description'] = businessDescriptionController.text;
    }

    return data;
  }

  Map<String, dynamic> _buildSiteData() {
    final data = {
      'name': businessNameController.text.isNotEmpty ? businessNameController.text : 'Site',
      'address': addressController.text,
      'description': descriptionController.text,
      'price_per_night': double.tryParse(priceController.text) ?? 0,
      'city': city,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
      'capacity': maxVehicleLength.toInt(),
      'max_vehicle_height_ft': maxVehicleHeight,
      'max_vehicle_width_ft': maxVehicleWidth,
      'max_vehicle_length_ft': maxVehicleLength,
      'amenities': selectedFacilities.entries.where((e) => e.value).map((e) => e.key).toList(),
      'place_type': selectedLocationType,
    };

    // Add pub-specific data if location type is pub
    if (selectedLocationType == 'pub') {
      data['opening_hours'] = _formatTimeRange(pubOpenTime, pubCloseTime);
      data['kitchen_hours'] = _formatTimeRange(kitchenOpenTime, kitchenCloseTime);
      data['food_menu_description'] = foodMenuController.text;
    }

    // Add business description if provided
    if (businessDescriptionController.text.isNotEmpty) {
      data['business_description'] = businessDescriptionController.text;
    }

    return data;
  }

  String _formatTimeRange(TimeOfDay? start, TimeOfDay? end) {
    if (start == null || end == null) return '';
    String format(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return '${format(start)} - ${format(end)}';
  }

  Map<String, TimeOfDay>? _parseTimeRange(String timeRange) {
    try {
      // Parse format "HH:MM - HH:MM"
      final parts = timeRange.split(' - ');
      if (parts.length != 2) return null;
      
      final startParts = parts[0].split(':');
      final endParts = parts[1].split(':');
      
      if (startParts.length != 2 || endParts.length != 2) return null;
      
      return {
        'start': TimeOfDay(hour: int.parse(startParts[0]), minute: int.parse(startParts[1])),
        'end': TimeOfDay(hour: int.parse(endParts[0]), minute: int.parse(endParts[1])),
      };
    } catch (e) {
      print('Error parsing time range: $e');
      return null;
    }
  }

  String _formatTime(TimeOfDay? time) {
    if (time == null) return 'Not set';
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  void _openAddressSearch() async {
    final result = await showModalBottomSheet<PlaceDetails>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AddressSearchBottomSheet(),
    );

    if (result != null && mounted) {
      setState(() {
        addressController.text = result.formattedAddress;
        latitude = result.latitude;
        longitude = result.longitude;
        city = result.city;
        country = result.country;
        addressVerified = true;
      });
    }
  }

  Future<void> _submitSite() async {
    // Validate required fields
    // Allow bypassing address verification if editing and address hasn't changed
    final isEditing = widget.siteToEdit != null;
    final addressUnchanged = isEditing && addressController.text == widget.siteToEdit!['address'];
    
    if (!addressVerified && !addressUnchanged) {
      if (addressController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a valid address from the suggestions')),
        );
        return;
      }
    }

    if (descriptionController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a site description')),
      );
      return;
    }

    if (mainPhotoFile == null && widget.siteToEdit == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload a main photo')),
      );
      return;
    }

    final price = double.tryParse(priceController.text);
    if (price == null || price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid price')),
      );
      return;
    }

    if (price > 20) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Price cannot exceed £20')),
      );
      return;
    }

    if (!vehicleDimensionsConfirmed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please confirm the vehicle size limits for your site')),
      );
      return;
    }

    setState(() => isSubmitting = true);

    try {
      final siteData = _buildSiteData();
      siteData['approval_status'] = 'pending';

      int placeId;
      
      if (isEditing) {
        // Update existing place
        placeId = widget.siteToEdit!['id'];
        await PlaceService.updatePlace(placeId, siteData);
      } else {
        // Create new place
        final createdPlace = await PlaceService.createPlace(siteData);
        placeId = createdPlace['place']?['id'] ?? createdPlace['id'];
      }

      // Upload site photos (main + supporting) separately from business photos
      final sitePhotos = <File>[];
      if (mainPhotoFile != null) sitePhotos.add(mainPhotoFile!);
      sitePhotos.addAll(supportingPhotos);

      // Upload site photos if any
      if (sitePhotos.isNotEmpty) {
        await PlaceService.uploadPlacePhotos(placeId, sitePhotos, category: 'site');
      }
      
      // Upload business photos separately
      if (businessPhotos.isNotEmpty) {
        await PlaceService.uploadPlacePhotos(placeId, businessPhotos, category: 'business');
      }

      // Clear draft
      await StorageService.removeString('site_draft');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isEditing ? 'Site updated successfully! 🎉' : 'Site submitted successfully! 🎉')),
        );
        Navigator.pop(context, true); // Return true to refresh parent screen
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error submitting site: $e')),
        );
      }
    } finally {
      setState(() => isSubmitting = false);
    }
  }

  void _onPriceFocusChange() {
    setState(() {});  // Trigger rebuild when focus changes
  }

  @override
  void dispose() {
    _priceFocusNode.removeListener(_onPriceFocusChange);
    addressController.dispose();
    descriptionController.dispose();
    priceController.dispose();
    websiteController.dispose();
    businessNameController.dispose();
    foodMenuController.dispose();
    businessDescriptionController.dispose();
    searchAddressController.dispose();
    _priceFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final showToolbar = _priceFocusNode.hasFocus && keyboardHeight > 0;
    
    return Scaffold(
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Add Your Site',
          style: TextStyle(color: Colors.black, fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
      body: Stack(
        children: [
          GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: showToolbar ? keyboardHeight + 60 : 100,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
            // Debug: Print values at build time
            Builder(builder: (_) { 
              print('DEBUG BUILD: mainPhotoFile=$mainPhotoFile, existingMainPhotoUrl=$existingMainPhotoUrl'); 
              return const SizedBox.shrink(); 
            }),
            // Main Photo Section
            _buildPhotoSection(
              title: 'Main Site Photo',
              subtitle: 'This will be the main image shown to guests',
              file: mainPhotoFile,
              existingUrl: existingMainPhotoUrl,
              onAddPhoto: () => _pickPhoto((file) {
                setState(() {
                  mainPhotoFile = file;
                  existingMainPhotoUrl = null; // Clear URL when new file selected
                });
              }),
              onRemovePhoto: () => setState(() {
                mainPhotoFile = null;
                existingMainPhotoUrl = null;
              }),
            ),
            const SizedBox(height: 24),

            // Supporting Photos Section
            _buildMultiPhotoSection(
              key: const ValueKey('supporting_photos'),
              title: 'Supporting Photos',
              subtitle: 'Add additional photos of your site (max 5)',
              files: supportingPhotos,
              existingUrls: existingSupportingUrls,
              maxPhotos: 5,
              onAddPhoto: () => _pickPhoto((file) {
                print('DEBUG: Adding photo to SUPPORTING photos');
                if (supportingPhotos.length + existingSupportingUrls.length < 5) {
                  setState(() => supportingPhotos.add(file));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Maximum 5 supporting photos allowed')),
                  );
                }
              }),
              onRemovePhoto: (index) => setState(() => supportingPhotos.removeAt(index)),
              onRemoveExistingUrl: (index) => setState(() => existingSupportingUrls.removeAt(index)),
            ),
            const SizedBox(height: 24),

            // Location Type Selector
            _buildLocationTypeSelector(),
            const SizedBox(height: 24),

            // Pub-Specific Fields (shown only when pub is selected)
            if (selectedLocationType == 'pub') ...[
              _buildPubSpecificSection(),
              const SizedBox(height: 24),
            ],

            // Address Autocomplete Field
            Text(
              'Site Address *',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Tap to search and select your address',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            
            // Selected Address Display (when verified)
            if (addressVerified) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF22C55E)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Verified Address',
                            style: TextStyle(fontSize: 12, color: Color(0xFF16A34A), fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            addressController.text,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit, size: 20, color: Color(0xFF3B82F6)),
                      onPressed: () => _openAddressSearch(),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Tap to open address search modal
              GestureDetector(
                onTap: () => _openAddressSearch(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.search, color: const Color(0xFF3B82F6)),
                      const SizedBox(width: 12),
                      Text(
                        'Tap to search for address...',
                        style: TextStyle(color: Colors.grey[600], fontSize: 16),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.info_outline, size: 14, color: Colors.grey[500]),
                  const SizedBox(width: 6),
                  Text(
                    'Powered by Google Places for accurate location data',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),

            // Description Field
            _buildTextField(
              label: 'Site Description *',
              hint: 'Describe your site, location, amenities...',
              controller: descriptionController,
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            // Vehicle Size Restrictions Section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF0EA5E9).withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.directions_car, color: const Color(0xFF0EA5E9), size: 24),
                      const SizedBox(width: 8),
                      Text(
                        'Vehicle Size Limits *',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF0369A1),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Important: Set the maximum vehicle dimensions that can fit on your site',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 16),

                  // Max Vehicle Height Slider
                  Text(
                    'Maximum Vehicle Height',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Slider(
                          value: maxVehicleHeight,
                          min: 6,
                          max: 15,
                          divisions: 18,
                          label: '${maxVehicleHeight.toStringAsFixed(1)}ft',
                          onChanged: (value) => setState(() => maxVehicleHeight = value),
                        ),
                      ),
                      Container(
                        width: 60,
                        alignment: Alignment.center,
                        child: Text(
                          '${maxVehicleHeight.toStringAsFixed(1)}ft',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Max Vehicle Width Slider
                  Text(
                    'Maximum Vehicle Width',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Slider(
                          value: maxVehicleWidth,
                          min: 6,
                          max: 12,
                          divisions: 12,
                          label: '${maxVehicleWidth.toStringAsFixed(1)}ft',
                          onChanged: (value) => setState(() => maxVehicleWidth = value),
                        ),
                      ),
                      Container(
                        width: 60,
                        alignment: Alignment.center,
                        child: Text(
                          '${maxVehicleWidth.toStringAsFixed(1)}ft',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Max Vehicle Length Slider
                  Text(
                    'Maximum Vehicle Length',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Slider(
                          value: maxVehicleLength,
                          min: 15,
                          max: 45,
                          divisions: 30,
                          label: '${maxVehicleLength.toStringAsFixed(0)}ft',
                          onChanged: (value) => setState(() => maxVehicleLength = value),
                        ),
                      ),
                      Container(
                        width: 60,
                        alignment: Alignment.center,
                        child: Text(
                          '${maxVehicleLength.toStringAsFixed(0)}ft',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Confirmation checkbox
                  Row(
                    children: [
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: Checkbox(
                          value: vehicleDimensionsConfirmed,
                          onChanged: (value) => setState(() => vehicleDimensionsConfirmed = value ?? false),
                          activeColor: const Color(0xFF0EA5E9),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => vehicleDimensionsConfirmed = !vehicleDimensionsConfirmed),
                          child: Text(
                            'I confirm these dimensions are correct for my site',
                            style: TextStyle(
                              fontSize: 13,
                              color: vehicleDimensionsConfirmed ? const Color(0xFF0369A1) : Colors.grey[700],
                              fontWeight: vehicleDimensionsConfirmed ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Price Per Night
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Price Per Night (£) *',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: priceController,
                  focusNode: _priceFocusNode,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  onChanged: (value) {
                    final price = double.tryParse(value) ?? 0;
                    if (price > 20) {
                      priceController.text = '20';
                    }
                  },
                  decoration: InputDecoration(
                    hintText: 'Max £20',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Facilities Selection
            _buildFacilitiesSection(),
            const SizedBox(height: 24),

            // Business Information Section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F4F8),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Business Information',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Please add information about goods or services your business can offer to guests. Adding menus, opening times etc here can help to generate further income by driving guests to your business.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    label: 'Business Name',
                    hint: 'E.g., The Old Barn Pub',
                    controller: businessNameController,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    label: 'Website / Contact Link',
                    hint: 'E.g., https://www.example.com',
                    controller: websiteController,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Business Description',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: businessDescriptionController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'E.g., We serve traditional pub food from 12pm-9pm daily. Our menu includes local ales, homemade pies, and Sunday roasts...',
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                      ),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildMultiPhotoSection(
                    key: const ValueKey('business_photos'),
                    title: 'Business Photos / Menu',
                    subtitle: 'Add menu or business photos (max 3)',
                    files: businessPhotos,
                    existingUrls: existingBusinessUrls,
                    maxPhotos: 3,
                    onAddPhoto: () => _pickPhoto((file) {
                      print('DEBUG: Adding photo to BUSINESS photos');
                      if (businessPhotos.length + existingBusinessUrls.length < 3) {
                        setState(() => businessPhotos.add(file));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Maximum 3 business photos allowed')),
                        );
                      }
                    }),
                    onRemovePhoto: (index) => setState(() => businessPhotos.removeAt(index)),
                    onRemoveExistingUrl: (index) => setState(() => existingBusinessUrls.removeAt(index)),
                    showTitle: false,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isSavingDraft ? null : _saveDraft,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: Color(0xFF3B82F6)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      isSavingDraft ? 'Saving...' : 'Save Draft',
                      style: const TextStyle(
                        color: Color(0xFF3B82F6),
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: isSubmitting ? null : _submitSite,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      isSubmitting ? 'Submitting...' : 'Submit Site',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // Delete Draft Button (show when editing any non-approved place)
            if (widget.siteToEdit != null && widget.siteToEdit!['approval_status'] != 'approved')
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: _deleteDraft,
                    style: TextButton.styleFrom(
                      backgroundColor: Colors.red,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Delete Draft',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 16),
          ],
        ),
      ),
          ),
          // Keyboard toolbar - positioned directly above keyboard
          if (showToolbar)
            Positioned(
              left: 0,
              right: 0,
              bottom: keyboardHeight,
              child: Container(
                height: 44,
                color: const Color(0xFFD1D5DB),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: () {
                        priceController.clear();
                        _priceFocusNode.unfocus();
                      },
                      child: const Text(
                        'Cancel',
                        style: TextStyle(color: Color(0xFF007AFF), fontSize: 17),
                      ),
                    ),
                    TextButton(
                      onPressed: () => _priceFocusNode.unfocus(),
                      child: const Text(
                        'Done',
                        style: TextStyle(
                          color: Color(0xFF007AFF),
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLocationTypeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Location Type *',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: selectedLocationType,
              isExpanded: true,
              items: locationTypes.map((type) {
                return DropdownMenuItem<String>(
                  value: type,
                  child: Row(
                    children: [
                      Icon(
                        _getLocationTypeIcon(type),
                        color: const Color(0xFF3B82F6),
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Text(locationTypeLabels[type] ?? type),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => selectedLocationType = value);
                }
              },
            ),
          ),
        ),
        if (selectedLocationType == 'pub') ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFF59E0B)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Color(0xFFD97706), size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Pubs can attract more visitors! Add your opening times and food menu below to encourage guests to visit your establishment.',
                    style: TextStyle(color: Colors.amber[900], fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  IconData _getLocationTypeIcon(String type) {
    switch (type) {
      case 'pub':
        return Icons.sports_bar;
      case 'farm':
        return Icons.agriculture;
      case 'car_park':
        return Icons.local_parking;
      case 'business':
        return Icons.business;
      case 'private_land':
        return Icons.home;
      default:
        return Icons.place;
    }
  }

  Widget _buildPubSpecificSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF97316)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.sports_bar, color: Color(0xFFF97316), size: 24),
              const SizedBox(width: 8),
              const Text(
                'Pub & Restaurant Details',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFC2410C)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Share your opening times and food offerings to encourage guests to visit your pub!',
            style: TextStyle(fontSize: 13, color: Color(0xFF9A3412)),
          ),
          const SizedBox(height: 20),

          // Opening Hours
          const Text(
            'Opening Hours',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF9A3412)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildTimePicker(
                  label: 'Open',
                  time: pubOpenTime,
                  onTap: () => _selectTime((time) => setState(() => pubOpenTime = time)),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text('to', style: TextStyle(fontWeight: FontWeight.w500)),
              ),
              Expanded(
                child: _buildTimePicker(
                  label: 'Close',
                  time: pubCloseTime,
                  onTap: () => _selectTime((time) => setState(() => pubCloseTime = time)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Kitchen Hours
          const Text(
            'Kitchen Hours',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF9A3412)),
          ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildTimePicker(
                    label: 'Open',
                    time: kitchenOpenTime,
                    onTap: () => _selectTime((time) => setState(() => kitchenOpenTime = time)),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text('to', style: TextStyle(fontWeight: FontWeight.w500)),
                ),
                Expanded(
                  child: _buildTimePicker(
                    label: 'Close',
                    time: kitchenCloseTime,
                    onTap: () => _selectTime((time) => setState(() => kitchenCloseTime = time)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Food Menu Description
            const Text(
              'Food Menu Highlights',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF9A3412)),
            ),
            const SizedBox(height: 4),
            const Text(
              'What food do you offer? This will encourage visitors!',
              style: TextStyle(fontSize: 12, color: Color(0xFF9A3412)),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: foodMenuController,
              maxLines: 3,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: 'E.g., Traditional pub food, Sunday roasts, local ales, vegetarian options...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFF97316)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFF97316), width: 2),
                ),
                filled: true,
                fillColor: Colors.white,
                suffixIcon: IconButton(
                  icon: const Icon(Icons.check_circle, color: Color(0xFF22C55E)),
                  onPressed: () => FocusScope.of(context).unfocus(),
                  tooltip: 'Done',
                ),
              ),
            ),

          const SizedBox(height: 16),
          // Encouragement message
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF22C55E).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF22C55E)),
            ),
            child: Row(
              children: [
                const Icon(Icons.lightbulb, color: Color(0xFF22C55E), size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Tip: Guests who stay at pubs often become regular customers! Share your best offerings to make a great first impression.',
                    style: TextStyle(color: Colors.green[800], fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimePicker({
    required String label,
    required TimeOfDay? time,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.circular(8),
          color: Colors.white,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.access_time, size: 18, color: time != null ? const Color(0xFFF97316) : Colors.grey),
            const SizedBox(width: 8),
            Text(
              time != null ? _formatTime(time) : label,
              style: TextStyle(
                color: time != null ? Colors.black : Colors.grey,
                fontWeight: time != null ? FontWeight.w500 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectTime(Function(TimeOfDay) onTimeSelected) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFFF97316),
              onPrimary: Colors.white,
              secondary: Color(0xFFFED7AA),
              onSurface: Colors.black,
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: Colors.black,
              ),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      onTimeSelected(picked);
    }
  }

  Widget _buildTextField({
    required String label,
    required String hint,
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    Function(String)? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            contentPadding: const EdgeInsets.all(12),
          ),
        ),
      ],
    );
  }

  Widget _buildPhotoSection({
    required String title,
    required String subtitle,
    required File? file,
    String? existingUrl,
    required VoidCallback onAddPhoto,
    required VoidCallback onRemovePhoto,
  }) {
    final hasImage = file != null || (existingUrl != null && existingUrl.isNotEmpty);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 12),
        if (!hasImage)
          GestureDetector(
            onTap: onAddPhoto,
            child: Container(
              width: double.infinity,
              height: 160,
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                borderRadius: BorderRadius.circular(12),
                color: const Color(0xFFF9FAFB),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.cloud_upload_outlined, size: 48, color: Color(0xFF3B82F6)),
                  SizedBox(height: 8),
                  Text(
                    'Tap to upload photo',
                    style: TextStyle(color: Color(0xFF3B82F6), fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          )
        else
          Stack(
            children: [
              Container(
                width: double.infinity,
                height: 160,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  image: DecorationImage(
                    image: file != null 
                        ? FileImage(file) as ImageProvider
                        : NetworkImage(existingUrl!) as ImageProvider,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: onRemovePhoto,
                  child: Container(
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.red,
                    ),
                    padding: const EdgeInsets.all(8),
                    child: const Icon(Icons.close, color: Colors.white, size: 20),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildMultiPhotoSection({
    required String title,
    required String subtitle,
    required List<File> files,
    List<String> existingUrls = const [],
    required VoidCallback onAddPhoto,
    required Function(int) onRemovePhoto,
    Function(int)? onRemoveExistingUrl,
    bool showTitle = true,
    int maxPhotos = 5,
    Key? key,
  }) {
    final totalPhotos = files.length + existingUrls.length;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showTitle) ...[
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 12),
        ],
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            // Display existing URLs first
            ...existingUrls.asMap().entries.map((entry) {
              int index = entry.key;
              String url = entry.value;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      image: DecorationImage(
                        image: NetworkImage(url),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Positioned(
                    top: -8,
                    right: -8,
                    child: GestureDetector(
                      onTap: () => onRemoveExistingUrl?.call(index),
                      child: Container(
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.red,
                        ),
                        padding: const EdgeInsets.all(4),
                        child: const Icon(Icons.close, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                ],
              );
            }),
            // Display newly selected files
            ...files.asMap().entries.map((entry) {
              int index = entry.key;
              File file = entry.value;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      image: DecorationImage(image: FileImage(file), fit: BoxFit.cover),
                    ),
                  ),
                  Positioned(
                    top: -8,
                    right: -8,
                    child: GestureDetector(
                      onTap: () => onRemovePhoto(index),
                      child: Container(
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.red,
                        ),
                        padding: const EdgeInsets.all(4),
                        child: const Icon(Icons.close, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                ],
              );
            }),
            if (totalPhotos < maxPhotos)
              GestureDetector(
                key: key != null ? ValueKey('${key}_add') : null,
                onTap: onAddPhoto,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                    borderRadius: BorderRadius.circular(8),
                    color: const Color(0xFFF9FAFB),
                  ),
                  child: const Center(
                    child: Icon(Icons.add, size: 32, color: Color(0xFFD1D5DB)),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildFacilitiesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Available Facilities',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        if (facilitiesLoading)
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: SizedBox(
              height: 24,
              width: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: selectedFacilities.keys.map((facility) {
              return FilterChip(
                label: Text(facility),
                selected: selectedFacilities[facility]!,
                onSelected: (bool selected) {
                  setState(() {
                    selectedFacilities[facility] = selected;
                  });
                },
                backgroundColor: Colors.white,
                selectedColor: const Color(0xFF3B82F6),
                side: BorderSide(
                  color: selectedFacilities[facility]!
                      ? const Color(0xFF3B82F6)
                      : const Color(0xFFE2E8F0),
                ),
                labelStyle: TextStyle(
                  color: selectedFacilities[facility]! ? Colors.white : Colors.black,
                  fontWeight: FontWeight.w500,
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Future<void> _pickPhoto(Function(File) onFilePicked) async {
    final file = await ImagePickerService.showImagePickerOptions(context);
    if (file != null) {
      onFilePicked(file);
    }
  }
}
// Address search bottom sheet widget
class _AddressSearchBottomSheet extends StatefulWidget {
  @override
  State<_AddressSearchBottomSheet> createState() => _AddressSearchBottomSheetState();
}

class _AddressSearchBottomSheetState extends State<_AddressSearchBottomSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<PlacePrediction> _suggestions = [];
  bool _isLoading = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) async {
    if (value.length >= 3) {
      setState(() => _isLoading = true);
      final suggestions = await GooglePlacesService.searchPlaces(value);
      if (mounted) {
        setState(() {
          _suggestions = suggestions;
          _isLoading = false;
        });
      }
    } else {
      setState(() {
        _suggestions = [];
        _isLoading = false;
      });
    }
  }

  void _selectSuggestion(PlacePrediction suggestion) async {
    setState(() => _isLoading = true);
    final details = await GooglePlacesService.getPlaceDetails(suggestion.placeId);
    if (details != null && mounted) {
      Navigator.of(context).pop(details);
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    // When keyboard is open, use remaining space; otherwise use 75% of screen
    final containerHeight = keyboardHeight > 0 
        ? screenHeight - keyboardHeight 
        : screenHeight * 0.75;
    
    return Container(
      height: containerHeight,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.location_on, color: Color(0xFF3B82F6)),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Search Address',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          
          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Enter postcode or address...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF3B82F6)),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _suggestions = []);
                        },
                      )
                    : null,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              onChanged: _onSearchChanged,
            ),
          ),
          
          const SizedBox(height: 8),
          
          // Loading indicator
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(),
            ),
          
          // Results list
          Expanded(
            child: _suggestions.isEmpty && !_isLoading
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search, size: 48, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          _searchController.text.isEmpty
                              ? 'Start typing to search'
                              : 'No results found',
                          style: const TextStyle(color: Colors.black54, fontSize: 16),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: EdgeInsets.only(bottom: 16, top: 8),
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: _suggestions.length,
                    itemBuilder: (context, index) {
                      final suggestion = _suggestions[index];
                      return ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFFEFF6FF),
                          child: Icon(Icons.location_on, color: Color(0xFF3B82F6)),
                        ),
                        title: Text(
                          suggestion.mainText,
                          style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.black),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          suggestion.secondaryText,
                          style: const TextStyle(color: Colors.black87, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => _selectSuggestion(suggestion),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}