import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:proper_place/services/image_picker_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/widgets/google_places_address_field.dart';

/// Result returned when the onboarding popup completes.
class OnboardingResult {
  final bool becameHost;
  const OnboardingResult({required this.becameHost});
}

/// Shows the first-login onboarding popup.
///
/// Returns [OnboardingResult] when the user taps submit/continue,
/// or null if the dialog is dismissed unexpectedly.
Future<OnboardingResult?> showOnboardingPopup(BuildContext context) {
  return showDialog<OnboardingResult>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const _OnboardingDialog(),
  );
}

class _OnboardingDialog extends StatefulWidget {
  const _OnboardingDialog();

  @override
  State<_OnboardingDialog> createState() => _OnboardingDialogState();
}

class _OnboardingDialogState extends State<_OnboardingDialog> {
  // ── Role selection ──────────────────────────────────────────────
  bool _isHost = false;

  // ── User path ───────────────────────────────────────────────────
  File? _vanPhoto;
  final _bioController = TextEditingController();
  // Dimensions stored in feet internally
  double _vehicleHeight = 12.0;
  double _vehicleWidth = 8.0;
  double _vehicleLength = 25.0;
  String _unit = 'ft';
  // Text-field controllers for manual dimension entry
  late TextEditingController _heightTextCtrl;
  late TextEditingController _widthTextCtrl;
  late TextEditingController _lengthTextCtrl;

  // ── Host path ───────────────────────────────────────────────────
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  double? _addressLat;
  double? _addressLng;

  // ── State ───────────────────────────────────────────────────────
  bool _isSaving = false;
  String? _errorMessage;

  // ── Dimension bounds (in feet) ──────────────────────────────────
  static const _heightMin = 3.3;
  static const _heightMax = 16.4;
  static const _widthMin = 4.0;
  static const _widthMax = 10.0;
  static const _lengthMin = 6.6;
  static const _lengthMax = 65.6; // ~20 m

  static const _blue = Color(0xFF4A7EB3);
  static const _lightBlue = Color(0xFF7BA7D8);

  double _feetToMetres(double ft) => ft * 0.3048;
  double _metresToFeet(double m) => m / 0.3048;

  String _displayValue(double valueFt) {
    if (_unit == 'm') {
      return _feetToMetres(valueFt).toStringAsFixed(2);
    }
    return valueFt.toStringAsFixed(1);
  }

  void _syncTextFromSliders() {
    _heightTextCtrl.text = _displayValue(_vehicleHeight);
    _widthTextCtrl.text = _displayValue(_vehicleWidth);
    _lengthTextCtrl.text = _displayValue(_vehicleLength);
  }

  @override
  void initState() {
    super.initState();
    _heightTextCtrl = TextEditingController(text: _displayValue(_vehicleHeight));
    _widthTextCtrl = TextEditingController(text: _displayValue(_vehicleWidth));
    _lengthTextCtrl = TextEditingController(text: _displayValue(_vehicleLength));
  }

  @override
  void dispose() {
    _bioController.dispose();
    _heightTextCtrl.dispose();
    _widthTextCtrl.dispose();
    _lengthTextCtrl.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  // ── Validation ─────────────────────────────────────────────────
  String? _validate() {
    if (_isHost) {
      if (_phoneController.text.trim().isEmpty) return 'Please enter your phone number.';
      if (_addressController.text.trim().isEmpty) return 'Please enter your hosting address.';
      if (_addressLat == null) return 'Please select your address from the suggestions.';
    } else {
      if (_vanPhoto == null) return 'Please add a van profile photo.';
      if (_bioController.text.trim().isEmpty) return 'Please write a short bio.';
    }
    return null;
  }

  // ── Save & finish ──────────────────────────────────────────────
  Future<void> _handleSubmit() async {
    setState(() => _errorMessage = null);
    final err = _validate();
    if (err != null) {
      setState(() => _errorMessage = err);
      return;
    }
    setState(() => _isSaving = true);
    try {
      final userId = await StorageService.getUserId();
      if (_isHost) {
        await StorageService.saveHostPhone(_phoneController.text.trim());
        await StorageService.saveHostAddress(
          address: _addressController.text.trim(),
          lat: _addressLat,
          lng: _addressLng,
        );
        await StorageService.saveUserRole('host');
        await StorageService.setHostMode(true);
        await StorageService.setAdminMode(false);
      } else {
        if (_vanPhoto != null) {
          await StorageService.saveVanPhotoPath(_vanPhoto!.path);
        }
        await StorageService.saveUserBio(_bioController.text.trim());
        await StorageService.saveVehicleDimensions(
          height: _vehicleHeight,
          width: _vehicleWidth,
          length: _vehicleLength,
          unit: _unit,
        );
      }
      await StorageService.setOnboardingCompleted(userId);
      if (mounted) {
        Navigator.of(context).pop(OnboardingResult(becameHost: _isHost));
      }
    } catch (e) {
      setState(() {
        _isSaving = false;
        _errorMessage = 'Something went wrong. Please try again.';
      });
    }
  }

  // ── Photo picker ───────────────────────────────────────────────
  Future<void> _pickVanPhoto() async {
    final file = await ImagePickerService.pickSingleImage(context);
    if (file != null && mounted) {
      setState(() => _vanPhoto = file);
    }
  }

  // ── Dimension helpers ──────────────────────────────────────────
  void _onSliderChanged(String dim, double newFt) {
    setState(() {
      if (dim == 'h') _vehicleHeight = newFt;
      if (dim == 'w') _vehicleWidth = newFt;
      if (dim == 'l') _vehicleLength = newFt;
    });
    _syncTextFromSliders();
  }

  void _onTextCommitted(String dim, String raw) {
    final parsed = double.tryParse(raw.replaceAll(',', '.'));
    if (parsed == null) return;
    final ft = _unit == 'm' ? _metresToFeet(parsed) : parsed;
    setState(() {
      if (dim == 'h') _vehicleHeight = ft.clamp(_heightMin, _heightMax);
      if (dim == 'w') _vehicleWidth = ft.clamp(_widthMin, _widthMax);
      if (dim == 'l') _vehicleLength = ft.clamp(_lengthMin, _lengthMax);
    });
    _syncTextFromSliders();
  }

  void _switchUnit(String unit) {
    setState(() => _unit = unit);
    _syncTextFromSliders();
  }

  // ── Build ──────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: SingleChildScrollView(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeader(),
              _buildToggle(),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: _isHost ? _buildHostFields() : _buildUserFields(),
              ),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red[50],
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.red[200]!),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(fontSize: 13, color: Colors.red[700]),
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
                child: _buildSubmitButton(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      color: const Color(0xFFF0F7FF),
      child: Column(
        children: const [
          Icon(Icons.landscape_outlined, size: 40, color: _blue),
          SizedBox(height: 8),
          Text(
            'Welcome to Proper Place!',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1A1A2E)),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 4),
          Text(
            'Tell us a bit about yourself to get started.',
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildToggle() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'I am joining as…',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                _toggleOption('Travelling', false),
                _toggleOption('Hosting', true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _toggleOption(String label, bool isHostOption) {
    final selected = _isHost == isHostOption;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _isHost = isHostOption),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? _blue : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : Colors.grey[600],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── User fields ────────────────────────────────────────────────
  Widget _buildUserFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Van Photo', required: true),
        _vanPhotoSection(),
        const SizedBox(height: 20),
        _sectionTitle('Vehicle Dimensions', required: true),
        const SizedBox(height: 4),
        const Text(
          'Helps us show you places that fit your vehicle.',
          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 12),
        _unitToggle(),
        const SizedBox(height: 12),
        _dimensionRow(
          icon: Icons.height,
          label: 'Height',
          sliderValue: _vehicleHeight,
          min: _heightMin,
          max: _heightMax,
          textCtrl: _heightTextCtrl,
          dimKey: 'h',
        ),
        const SizedBox(height: 10),
        _dimensionRow(
          icon: Icons.swap_horiz,
          label: 'Width',
          sliderValue: _vehicleWidth,
          min: _widthMin,
          max: _widthMax,
          textCtrl: _widthTextCtrl,
          dimKey: 'w',
        ),
        const SizedBox(height: 10),
        _dimensionRow(
          icon: Icons.straighten,
          label: 'Length',
          sliderValue: _vehicleLength,
          min: _lengthMin,
          max: _lengthMax,
          textCtrl: _lengthTextCtrl,
          dimKey: 'l',
        ),
        const SizedBox(height: 20),
        _sectionTitle('About You', required: true),
        const SizedBox(height: 4),
        const Text(
          'A short bio visible to hosts when you book.',
          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _bioController,
          maxLines: 3,
          maxLength: 300,
          textInputAction: TextInputAction.done,
          decoration: _inputDecoration('e.g. Retired couple touring the UK in our motorhome…'),
        ),
      ],
    );
  }

  Widget _vanPhotoSection() {
    return GestureDetector(
      onTap: _pickVanPhoto,
      child: Container(
        height: 140,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _vanPhoto != null ? _blue : Colors.grey[300]!,
            width: _vanPhoto != null ? 2 : 1,
          ),
        ),
        child: _vanPhoto != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(11),
                child: Image.file(_vanPhoto!, fit: BoxFit.cover),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.directions_bus_outlined, size: 36, color: Colors.grey[400]),
                  const SizedBox(height: 8),
                  Text(
                    'Tap to add a photo of your van',
                    style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _unitToggle() {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          _unitOption('ft', 'Feet'),
          _unitOption('m', 'Metres'),
        ],
      ),
    );
  }

  Widget _unitOption(String val, String label) {
    final selected = _unit == val;
    return Expanded(
      child: GestureDetector(
        onTap: () => _switchUnit(val),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? _lightBlue : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : Colors.grey[600],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _dimensionRow({
    required IconData icon,
    required String label,
    required double sliderValue,
    required double min,
    required double max,
    required TextEditingController textCtrl,
    required String dimKey,
  }) {
    final displayMin = _unit == 'm' ? _feetToMetres(min) : min;
    final displayMax = _unit == 'm' ? _feetToMetres(max) : max;
    final displaySlider = _unit == 'm' ? _feetToMetres(sliderValue) : sliderValue;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(icon, color: _lightBlue, size: 20),
        const SizedBox(width: 6),
        SizedBox(
          width: 50,
          child: Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey[700]),
          ),
        ),
        Expanded(
          child: SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 3,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
            ),
            child: Slider(
              value: displaySlider.clamp(displayMin, displayMax),
              min: displayMin,
              max: displayMax,
              activeColor: _lightBlue,
              inactiveColor: _lightBlue.withOpacity(0.2),
              onChanged: (v) {
                final ft = _unit == 'm' ? _metresToFeet(v) : v;
                _onSliderChanged(dimKey, ft);
              },
            ),
          ),
        ),
        SizedBox(
          width: 68,
          child: TextField(
            controller: textCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.done,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[\d\.,]')),
            ],
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
              suffixText: _unit,
              suffixStyle: TextStyle(fontSize: 11, color: Colors.grey[500]),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: _lightBlue, width: 2),
              ),
            ),
            onSubmitted: (v) => _onTextCommitted(dimKey, v),
            onEditingComplete: () {
              _onTextCommitted(dimKey, textCtrl.text);
              FocusScope.of(context).unfocus();
            },
          ),
        ),
      ],
    );
  }

  // ── Host fields ────────────────────────────────────────────────
  Widget _buildHostFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Phone Number', required: true),
        const SizedBox(height: 8),
        TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumber],
          textInputAction: TextInputAction.next,
          decoration: _inputDecoration('e.g. 07700 900000'),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Hosting Address', required: true),
        const SizedBox(height: 4),
        const Text(
          'The address of the site you will be hosting at.',
          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 8),
        GooglePlacesAddressField(
          controller: _addressController,
          label: '',
          hint: 'Start typing your address…',
          showHeader: false,
          onAddressSelected: (address, lat, lng, city, country) {
            setState(() {
              _addressLat = lat;
              _addressLng = lng;
            });
          },
        ),
      ],
    );
  }

  // ── Shared helpers ────────────────────────────────────────────
  Widget _sectionTitle(String text, {bool required = false}) {
    return Row(
      children: [
        Text(
          text,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1A1A2E)),
        ),
        if (required)
          const Text(' *', style: TextStyle(fontSize: 14, color: Colors.red, fontWeight: FontWeight.w600)),
      ],
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _lightBlue, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }

  Widget _buildSubmitButton() {
    final isHost = _isHost;
    final label = isHost ? 'Press continue to open the host side of the app' : 'Get Started';
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isSaving ? null : _handleSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: _blue,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: _isSaving
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : Text(
                label,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
      ),
    );
  }
}
