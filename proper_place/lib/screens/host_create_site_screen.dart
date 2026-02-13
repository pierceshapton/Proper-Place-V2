import 'package:flutter/material.dart';
import 'dart:io';
import '../services/storage_service.dart';
import '../services/image_picker_service.dart';
import '../services/place_service.dart';
import '../services/google_places_service.dart';

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

  File? mainPhotoFile;
  List<File> supportingPhotos = [];
  List<File> businessPhotos = [];

  double maxVehicleLength = 20.0; // Default 20ft
  bool isSavingDraft = false;
  bool isSubmitting = false;

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
    'farm': 'Farm / Rural',
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

  final List<String> facilities = [
    'WiFi',
    'Electricity Hookup',
    'Water Supply',
    'Waste Disposal',
    'Parking',
    'Lighting',
    'Security',
    'Restaurant/Pub',
  ];

  Map<String, bool> selectedFacilities = {
    'WiFi': false,
    'Electricity Hookup': false,
    'Water Supply': false,
    'Waste Disposal': false,
    'Parking': false,
    'Lighting': false,
    'Security': false,
    'Restaurant/Pub': false,
  };

  @override
  void initState() {
    super.initState();
    addressController = TextEditingController();
    descriptionController = TextEditingController();
    priceController = TextEditingController();
    websiteController = TextEditingController();
    businessNameController = TextEditingController();
    foodMenuController = TextEditingController();

    if (widget.siteToEdit != null) {
      _loadExistingSite();
    } else {
      _loadDraft();
    }
  }

  Future<void> _loadExistingSite() async {
    final site = widget.siteToEdit!;
    setState(() {
      addressController.text = site['address'] ?? '';
      descriptionController.text = site['description'] ?? '';
      priceController.text = site['price_per_night']?.toString() ?? '';
      websiteController.text = site['website_url'] ?? '';
      businessNameController.text = site['business_name'] ?? '';
      maxVehicleLength = (site['max_vehicle_length'] ?? 20).toDouble();

      if (site['selected_facilities'] != null) {
        final facilitiesList = List<String>.from(site['selected_facilities']);
        for (var facility in facilitiesList) {
          if (selectedFacilities.containsKey(facility)) {
            selectedFacilities[facility] = true;
          }
        }
      }
    });
  }

  Future<void> _loadDraft() async {
    try {
      final draftJson = await StorageService.getString('site_draft');
      if (draftJson != null && mounted) {
        // Parse and load draft data
        // For now, just show that draft was available
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Draft loaded')),
        );
      }
    } catch (e) {
      print('Error loading draft: $e');
    }
  }

  Future<void> _saveDraft() async {
    setState(() => isSavingDraft = true);
    try {
      await StorageService.saveString('site_draft', _buildSiteData().toString());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Draft saved successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving draft: $e')),
        );
      }
    } finally {
      setState(() => isSavingDraft = false);
    }
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
      'amenities': selectedFacilities.entries.where((e) => e.value).map((e) => e.key).toList(),
      'place_type': selectedLocationType,
    };

    // Add pub-specific data if location type is pub
    if (selectedLocationType == 'pub') {
      data['opening_hours'] = _formatTimeRange(pubOpenTime, pubCloseTime);
      data['kitchen_hours'] = _formatTimeRange(kitchenOpenTime, kitchenCloseTime);
      data['food_menu_description'] = foodMenuController.text;
    }

    return data;
  }

  String _formatTimeRange(TimeOfDay? start, TimeOfDay? end) {
    if (start == null || end == null) return '';
    String format(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return '${format(start)} - ${format(end)}';
  }

  String _formatTime(TimeOfDay? time) {
    if (time == null) return 'Not set';
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  Future<void> _submitSite() async {
    // Validate required fields
    if (!addressVerified || addressController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a valid address from the suggestions')),
      );
      return;
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

    setState(() => isSubmitting = true);

    try {
      final siteData = _buildSiteData();

      // Create place first
      final createdPlace = await PlaceService.createPlace(siteData);
      final placeId = createdPlace['id'];

      // Collect all photos to upload
      final allPhotos = <File>[];
      if (mainPhotoFile != null) allPhotos.add(mainPhotoFile!);
      allPhotos.addAll(supportingPhotos);
      allPhotos.addAll(businessPhotos);

      // Upload photos if any
      if (allPhotos.isNotEmpty) {
        await PlaceService.uploadPlacePhotos(placeId, allPhotos);
      }

      // Clear draft
      await StorageService.removeString('site_draft');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Site submitted successfully! 🎉')),
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

  @override
  void dispose() {
    addressController.dispose();
    descriptionController.dispose();
    priceController.dispose();
    websiteController.dispose();
    businessNameController.dispose();
    foodMenuController.dispose();
    searchAddressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Main Photo Section
            _buildPhotoSection(
              title: 'Main Site Photo',
              subtitle: 'This will be the main image shown to guests',
              file: mainPhotoFile,
              onAddPhoto: () => _pickPhoto((file) {
                setState(() => mainPhotoFile = file);
              }),
              onRemovePhoto: () => setState(() => mainPhotoFile = null),
            ),
            const SizedBox(height: 24),

            // Supporting Photos Section
            _buildMultiPhotoSection(
              title: 'Supporting Photos',
              subtitle: 'Add additional photos of your site (max 5)',
              files: supportingPhotos,
              onAddPhoto: () => _pickPhoto((file) {
                if (supportingPhotos.length < 5) {
                  setState(() => supportingPhotos.add(file));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Maximum 5 supporting photos allowed')),
                  );
                }
              }),
              onRemovePhoto: (index) => setState(() => supportingPhotos.removeAt(index)),
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
              'Search and select your address from the suggestions',
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
                      onPressed: () {
                        setState(() {
                          addressVerified = false;
                          searchAddressController.text = '';
                        });
                      },
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Search field
              Stack(
                clipBehavior: Clip.none,
                children: [
                  TextField(
                    controller: searchAddressController,
                    decoration: InputDecoration(
                      hintText: 'Search for your address...',
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF3B82F6)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: Colors.grey[50],
                    ),
                    onChanged: (value) async {
                      if (value.length >= 3) {
                        final suggestions = await GooglePlacesService.searchPlaces(value);
                        setState(() {
                          addressSuggestions = suggestions;
                          showAddressSuggestions = suggestions.isNotEmpty;
                        });
                      } else {
                        setState(() {
                          showAddressSuggestions = false;
                        });
                      }
                    },
                  ),
                  if (showAddressSuggestions)
                    Positioned(
                      top: 56,
                      left: 0,
                      right: 0,
                      child: Material(
                        elevation: 8,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          constraints: const BoxConstraints(maxHeight: 250),
                          child: ListView.builder(
                            shrinkWrap: true,
                            padding: EdgeInsets.zero,
                            itemCount: addressSuggestions.length,
                            itemBuilder: (context, index) {
                              final suggestion = addressSuggestions[index];
                              return ListTile(
                                leading: const Icon(Icons.location_on, color: Color(0xFF3B82F6)),
                                title: Text(suggestion.mainText, style: const TextStyle(fontWeight: FontWeight.w500)),
                                subtitle: Text(suggestion.secondaryText, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                                onTap: () async {
                                  // Get full details from Google Places
                                  final details = await GooglePlacesService.getPlaceDetails(suggestion.placeId);
                                  if (details != null) {
                                    setState(() {
                                      addressController.text = details.formattedAddress;
                                      latitude = details.latitude;
                                      longitude = details.longitude;
                                      city = details.city;
                                      country = details.country;
                                      addressVerified = true;
                                      showAddressSuggestions = false;
                                      searchAddressController.text = '';
                                    });
                                  }
                                },
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                ],
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
            const SizedBox(height: 16),

            // Max Vehicle Length Slider
            Text(
              'Maximum Vehicle Length',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Slider(
                    value: maxVehicleLength,
                    min: 1,
                    max: 30,
                    divisions: 29,
                    label: '${maxVehicleLength.toStringAsFixed(0)}ft',
                    onChanged: (value) => setState(() => maxVehicleLength = value),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 16),
                  child: Text(
                    '${maxVehicleLength.toStringAsFixed(0)}ft',
                    style:
                        const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Price Per Night
            _buildTextField(
              label: 'Price Per Night (£) *',
              hint: 'Max £20',
              controller: priceController,
              keyboardType: TextInputType.number,
              onChanged: (value) {
                final price = double.tryParse(value) ?? 0;
                if (price > 20) {
                  priceController.text = '20';
                }
              },
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
                  _buildMultiPhotoSection(
                    title: 'Business Photos / Menu',
                    subtitle: 'Add menu or business photos (max 3)',
                    files: businessPhotos,
                    onAddPhoto: () => _pickPhoto((file) {
                      if (businessPhotos.length < 3) {
                        setState(() => businessPhotos.add(file));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Maximum 3 business photos allowed')),
                        );
                      }
                    }),
                    onRemovePhoto: (index) => setState(() => businessPhotos.removeAt(index)),
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
            const SizedBox(height: 16),
          ],
        ),
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
    required VoidCallback onAddPhoto,
    required VoidCallback onRemovePhoto,
  }) {
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
        if (file == null)
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
                  image: DecorationImage(image: FileImage(file), fit: BoxFit.cover),
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
    required VoidCallback onAddPhoto,
    required Function(int) onRemovePhoto,
    bool showTitle = true,
  }) {
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
            ...files.asMap().entries.map((entry) {
              int index = entry.key;
              File file = entry.value;
              return Stack(
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
            if (files.length < 5 || title.contains('Supporting'))
              GestureDetector(
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
