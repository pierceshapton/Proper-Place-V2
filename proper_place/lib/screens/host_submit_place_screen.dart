import 'package:flutter/material.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/image_picker_service.dart';
import 'package:proper_place/widgets/google_places_address_field.dart';
import 'dart:io';

class HostSubmitPlaceScreen extends StatefulWidget {
  final Map<String, dynamic>? placeToEdit;

  const HostSubmitPlaceScreen({Key? key, this.placeToEdit}) : super(key: key);

  @override
  State<HostSubmitPlaceScreen> createState() => _HostSubmitPlaceScreenState();
}

class _HostSubmitPlaceScreenState extends State<HostSubmitPlaceScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController nameController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final TextEditingController priceController = TextEditingController();
  final TextEditingController amenitiesController = TextEditingController();

  String? selectedPlaceType;
  File? selectedImage;
  double? locationLat;
  double? locationLng;
  bool isSubmitting = false;
  late bool isEditing;

  final List<String> placeTypes = [
    'Grassland',
    'Woodland',
    'Urban',
    'Beachside',
    'Mountainous',
    'Farm',
    'Private Property',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    isEditing = widget.placeToEdit != null;

    // Pre-fill form if editing
    if (isEditing) {
      nameController.text = widget.placeToEdit!['name'] as String? ?? '';
      addressController.text = widget.placeToEdit!['address'] as String? ?? '';
    }
  }


  Future<void> _pickImage() async {
    final file = await ImagePickerService.showImagePickerOptions(context);
    if (file != null) {
      setState(() {
        selectedImage = file;
      });
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location detection coming soon')),
      );
      // TODO: Integrate geolocator to get current location
      // For now, set dummy coordinates
      setState(() {
        locationLat = 51.5074;
        locationLng = -0.1278;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error getting location: $e')),
      );
    }
  }

  Future<void> _submitPlace() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (selectedPlaceType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a place type')),
      );
      return;
    }

    if (locationLat == null || locationLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please set location')),
      );
      return;
    }

    setState(() => isSubmitting = true);

    try {
      final result = await ApiService.submitPlace(
        name: nameController.text.trim(),
        description: descriptionController.text.trim(),
        locationLat: locationLat!,
        locationLng: locationLng!,
        address: addressController.text.trim(),
        pricePerNight: double.parse(priceController.text),
        placeType: selectedPlaceType!,
        imageUrl: selectedImage?.path,
        amenities: amenitiesController.text.trim(),
      );

      if (mounted) {
        // Show confirmation dialog
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (BuildContext context) {
            return AlertDialog(
              title: const Text('Submission for Review'),
              content: Text(
                'Your ${isEditing ? 'updated ' : ''}Proper Place site will be sent to our admin team for approval. '
                'You will receive a notification once it has been reviewed.',
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context); // Close dialog
                    Navigator.pop(context); // Return to host places page
                  },
                  child: const Text('Okay'),
                ),
              ],
            );
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error submitting place: $e')),
        );
      }
    } finally {
      setState(() => isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
            isEditing ? 'Edit your Proper Place site' : 'Submit Your Place'),
        elevation: 0,
      ),
      resizeToAvoidBottomInset: false,
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image picker
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: selectedImage != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(
                            selectedImage!,
                            fit: BoxFit.cover,
                          ),
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.image_not_supported,
                              size: 48,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Tap to add image',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 20),
              // Place name
              const Text(
                'Place Name',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: nameController,
                decoration: InputDecoration(
                  hintText: 'e.g. Avalon Grassland',
                  hintStyle: TextStyle(color: Colors.grey[700]),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter a place name';
                  }
                  if (value.length < 3) {
                    return 'Place name must be at least 3 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Description
              const Text(
                'Description',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: descriptionController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Describe your place in detail...',
                  hintStyle: TextStyle(color: Colors.grey[700]),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter a description';
                  }
                  if (value.length < 10) {
                    return 'Description must be at least 10 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Address
              GooglePlacesAddressField(
                controller: addressController,
                label: 'Address',
                hint: 'Start typing city or address...',
                onAddressSelected: (address, lat, lng, city, country) {
                  setState(() {
                    locationLat = lat;
                    locationLng = lng;
                  });
                },
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter an address';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Location button
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _getCurrentLocation,
                      icon: const Icon(Icons.location_on),
                      label: const Text('Set Location'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (locationLat != null && locationLng != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Set',
                        style: TextStyle(color: Colors.green[800]),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              // Place type
              const Text(
                'Place Type',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: selectedPlaceType,
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                items: placeTypes
                    .map((type) => DropdownMenuItem(
                          value: type,
                          child: Text(type),
                        ))
                    .toList(),
                onChanged: (value) {
                  setState(() => selectedPlaceType = value);
                },
                validator: (value) {
                  if (value == null) {
                    return 'Please select a place type';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Price per night
              const Text(
                'Price Per Night (£)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: priceController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  hintText: '10',
                  hintStyle: TextStyle(color: Colors.grey[700]),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a price';
                  }
                  if (double.tryParse(value) == null) {
                    return 'Please enter a valid price';
                  }
                  if (double.parse(value) <= 0) {
                    return 'Price must be greater than 0';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Amenities
              const Text(
                'Amenities (Optional)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: amenitiesController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'e.g. Water, Electric, WiFi',
                  hintStyle: TextStyle(color: Colors.grey[700]),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isSubmitting ? null : _submitPlace,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF5B8DEE),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          isEditing ? 'Submit Updates' : 'Submit for Approval',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    nameController.dispose();
    descriptionController.dispose();
    addressController.dispose();
    priceController.dispose();
    amenitiesController.dispose();
    super.dispose();
  }
}
