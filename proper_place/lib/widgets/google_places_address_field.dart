import 'package:flutter/material.dart';
import '../services/google_places_service.dart';

class GooglePlacesAddressField extends StatefulWidget {
  final TextEditingController? controller;
  final String label;
  final String hint;
  final Function(String address, double lat, double lng, String city, String country)? onAddressSelected;
  final String? Function(String?)? validator;
  final bool isRequired;
  /// When false, hides the label, subtitle, and "Powered by Google" footer
  final bool showHeader;
  /// Pre-fill the field as already-verified (e.g. My Location)
  final String? prefillAddress;
  final double? prefillLat;
  final double? prefillLng;
  /// When true, the verified box uses blue styling instead of green
  final bool isMyLocation;

  const GooglePlacesAddressField({
    Key? key,
    this.controller,
    required this.label,
    this.hint = '',
    this.onAddressSelected,
    this.validator,
    this.isRequired = true,
    this.showHeader = true,
    this.prefillAddress,
    this.prefillLat,
    this.prefillLng,
    this.isMyLocation = false,
  }) : super(key: key);

  @override
  State<GooglePlacesAddressField> createState() => _GooglePlacesAddressFieldState();
}

class _GooglePlacesAddressFieldState extends State<GooglePlacesAddressField> {
  late TextEditingController _mainController;
  bool _addressVerified = false;
  double? _latitude;
  double? _longitude;
  String? _city;
  String? _country;

  @override
  void initState() {
    super.initState();
    _mainController = widget.controller ?? TextEditingController();
    if (widget.prefillAddress != null) {
      _mainController.text = widget.prefillAddress!;
      _addressVerified = true;
      _latitude = widget.prefillLat;
      _longitude = widget.prefillLng;
    }
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _mainController.dispose();
    }
    super.dispose();
  }

  void _openAddressSearch() async {
    final result = await showModalBottomSheet<PlaceDetails>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _AddressSearchSheet(),
    );

    if (result != null && mounted) {
      setState(() {
        _mainController.text = result.formattedAddress;
        _latitude = result.latitude;
        _longitude = result.longitude;
        _city = result.city;
        _country = result.country;
        _addressVerified = true;
      });

      if (widget.onAddressSelected != null) {
        widget.onAddressSelected!(
          result.formattedAddress,
          result.latitude,
          result.longitude,
          result.city,
          result.country,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final Color verifiedBg = widget.isMyLocation
        ? const Color(0xFFEFF6FF)
        : const Color(0xFFECFDF5);
    final Color verifiedBorder = widget.isMyLocation
        ? const Color(0xFF3B82F6)
        : const Color(0xFF22C55E);
    final Color verifiedIcon = widget.isMyLocation
        ? const Color(0xFF3B82F6)
        : const Color(0xFF22C55E);
    final Color verifiedLabel = widget.isMyLocation
        ? const Color(0xFF1D4ED8)
        : const Color(0xFF16A34A);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.showHeader) ...[  
          Text(
            widget.label,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap to search and select your address',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
        ],

        // Selected Address Display (when verified)
        if (_addressVerified) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: verifiedBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: verifiedBorder),
            ),
            child: Row(
              children: [
                Icon(
                  widget.isMyLocation ? Icons.my_location : Icons.check_circle,
                  color: verifiedIcon,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.isMyLocation ? 'My Location' : 'Verified Address',
                        style: TextStyle(fontSize: 12, color: verifiedLabel, fontWeight: FontWeight.w600),
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
                  onPressed: _openAddressSearch,
                ),
              ],
            ),
          ),
        ] else ...[
          // Tap to search field
          GestureDetector(
            onTap: _openAddressSearch,
            child: AbsorbPointer(
              child: TextFormField(
                controller: TextEditingController(text: ''),
                decoration: InputDecoration(
                  hintText: widget.hint.isNotEmpty ? widget.hint : 'Tap to search for address...',
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF3B82F6)),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  filled: true,
                  fillColor: Colors.grey[50],
                ),
                validator: widget.isRequired 
                  ? (value) {
                      if (!_addressVerified) {
                        return 'Please select a valid address';
                      }
                      return widget.validator?.call(_mainController.text);
                    }
                  : null,
              ),
            ),
          ),
          if (widget.showHeader) ...[  
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
      _mainController.text = '';
      _latitude = null;
      _longitude = null;
      _city = null;
      _country = null;
    });
  }
}

// Separate widget for the address search bottom sheet
class _AddressSearchSheet extends StatefulWidget {
  const _AddressSearchSheet();

  @override
  State<_AddressSearchSheet> createState() => _AddressSearchSheetState();
}

class _AddressSearchSheetState extends State<_AddressSearchSheet> {
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
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    // Use most of the available area above the keyboard so the input never
    // gets covered by the suggestions list when the keyboard is open.
    // The extra 50px accounts for the iOS autofill suggestion bar.
    final sheetHeight = (screenHeight - bottomPadding - 74)
        .clamp(280.0, screenHeight * 0.95);

    return Padding(
      padding: EdgeInsets.only(bottom: bottomPadding),
      child: Container(
        height: sheetHeight,
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
              autofillHints: const [AutofillHints.streetAddressLine1],
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
                    padding: const EdgeInsets.only(bottom: 16),
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
    ),
    );
  }
}
