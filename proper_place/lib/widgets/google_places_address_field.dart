import 'package:flutter/material.dart';
import '../services/google_places_service.dart';

class GooglePlacesAddressField extends StatefulWidget {
  final TextEditingController? controller;
  final String label;
  final String hint;
  final Function(String address, double lat, double lng, String city, String country)? onAddressSelected;
  final String? Function(String?)? validator;
  final bool isRequired;

  const GooglePlacesAddressField({
    Key? key,
    this.controller,
    required this.label,
    this.hint = '',
    this.onAddressSelected,
    this.validator,
    this.isRequired = true,
  }) : super(key: key);

  @override
  State<GooglePlacesAddressField> createState() => _GooglePlacesAddressFieldState();
}

class _GooglePlacesAddressFieldState extends State<GooglePlacesAddressField> {
  late TextEditingController _searchController;
  late TextEditingController _mainController;
  List<PlacePrediction> _suggestions = [];
  bool _showSuggestions = false;
  bool _addressVerified = false;
  double? _latitude;
  double? _longitude;
  String? _city;
  String? _country;

  @override
  void initState() {
    super.initState();
    _mainController = widget.controller ?? TextEditingController();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    if (widget.controller == null) {
      _mainController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Search and select your address from the suggestions',
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        const SizedBox(height: 8),

        // Selected Address Display (when verified)
        if (_addressVerified) ...[
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
                        _mainController.text,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFF3B82F6)),
                  onPressed: () {
                    setState(() {
                      _addressVerified = false;
                      _searchController.text = '';
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
              TextFormField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: widget.hint,
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF3B82F6)),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  filled: true,
                  fillColor: Colors.grey[50],
                ),
                validator: widget.isRequired 
                  ? (value) {
                      if (!_addressVerified) {
                        return 'Please select a valid address from the suggestions';
                      }
                      return widget.validator?.call(_mainController.text);
                    }
                  : null,
                onChanged: (value) async {
                  if (value.length >= 3) {
                    final suggestions = await GooglePlacesService.searchPlaces(value);
                    setState(() {
                      _suggestions = suggestions;
                      _showSuggestions = suggestions.isNotEmpty;
                    });
                  } else {
                    setState(() {
                      _showSuggestions = false;
                    });
                  }
                },
              ),
              if (_showSuggestions)
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
                        itemCount: _suggestions.length,
                        itemBuilder: (context, index) {
                          final suggestion = _suggestions[index];
                          return ListTile(
                            leading: const Icon(Icons.location_on, color: Color(0xFF3B82F6)),
                            title: Text(suggestion.mainText, style: const TextStyle(fontWeight: FontWeight.w500)),
                            subtitle: Text(suggestion.secondaryText, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                            onTap: () async {
                              // Get full details from Google Places
                              final details = await GooglePlacesService.getPlaceDetails(suggestion.placeId);
                              if (details != null) {
                                setState(() {
                                  _mainController.text = details.formattedAddress;
                                  _latitude = details.latitude;
                                  _longitude = details.longitude;
                                  _city = details.city;
                                  _country = details.country;
                                  _addressVerified = true;
                                  _showSuggestions = false;
                                  _searchController.text = '';
                                });
                                
                                // Notify parent widget
                                if (widget.onAddressSelected != null) {
                                  widget.onAddressSelected!(
                                    details.formattedAddress,
                                    details.latitude,
                                    details.longitude,
                                    details.city,
                                    details.country,
                                  );
                                }
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
      ],
    );
  }

  // Getter methods for parent widgets to access data
  bool get isAddressVerified => _addressVerified;
  double? get latitude => _latitude;
  double? get longitude => _longitude;
  String? get city => _city;
  String? get country => _country;
  
  // Method to reset the field
  void reset() {
    setState(() {
      _addressVerified = false;
      _searchController.text = '';
      _mainController.text = '';
      _latitude = null;
      _longitude = null;
      _city = null;
      _country = null;
      _showSuggestions = false;
    });
  }
}