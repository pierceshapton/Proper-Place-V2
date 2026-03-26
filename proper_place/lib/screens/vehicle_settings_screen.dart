import 'package:flutter/material.dart';
import '../services/storage_service.dart';

class VehicleSettingsScreen extends StatefulWidget {
  const VehicleSettingsScreen({super.key});

  @override
  State<VehicleSettingsScreen> createState() => _VehicleSettingsScreenState();
}

class _VehicleSettingsScreenState extends State<VehicleSettingsScreen> {
  static const Color lightBlue = Color(0xFF6B96C8);
  
  double _vehicleHeight = 12.0;
  double _vehicleWidth = 8.0;
  double _vehicleLength = 25.0;
  String _unit = 'ft';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadVehicleDimensions();
  }

  Future<void> _loadVehicleDimensions() async {
    final dimensions = await StorageService.getVehicleDimensions();
    if (mounted) {
      setState(() {
        _vehicleHeight = dimensions['height'] as double;
        // Clamp width to valid range (4-8ft)
        _vehicleWidth = (dimensions['width'] as double).clamp(4.0, 8.0);
        _vehicleLength = dimensions['length'] as double;
        _unit = dimensions['unit'] as String;
        _isLoading = false;
      });
    }
  }

  Future<void> _saveVehicleDimensions() async {
    await StorageService.saveVehicleDimensions(
      height: _vehicleHeight,
      width: _vehicleWidth,
      length: _vehicleLength,
      unit: _unit,
    );
  }

  // Convert feet to metres
  double _feetToMetres(double feet) => feet * 0.3048;
  
  // Convert metres to feet
  double _metresToFeet(double metres) => metres / 0.3048;

  String _formatValue(double value) {
    if (_unit == 'm') {
      return '${_feetToMetres(value).toStringAsFixed(2)}m';
    }
    return '${value.toStringAsFixed(1)}ft';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Vehicle Dimensions',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: const [],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: lightBlue))
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Info Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: lightBlue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: lightBlue.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline, color: lightBlue),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Enter your vehicle dimensions to help filter places that can accommodate your vehicle.',
                              style: TextStyle(
                                color: Colors.grey[700],
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Unit Toggle
                    _buildSectionTitle('Unit'),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _unit = 'ft';
                                });
                                _saveVehicleDimensions();
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                decoration: BoxDecoration(
                                  color: _unit == 'ft' ? lightBlue : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Center(
                                  child: Text(
                                    'Feet',
                                    style: TextStyle(
                                      color: _unit == 'ft' ? Colors.white : Colors.grey[600],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _unit = 'm';
                                });
                                _saveVehicleDimensions();
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                decoration: BoxDecoration(
                                  color: _unit == 'm' ? lightBlue : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Center(
                                  child: Text(
                                    'Metres',
                                    style: TextStyle(
                                      color: _unit == 'm' ? Colors.white : Colors.grey[600],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Vehicle Height
                    _buildSectionTitle('Vehicle Height'),
                    const SizedBox(height: 12),
                    _buildDimensionSlider(
                      icon: Icons.height,
                      value: _vehicleHeight,
                      min: 3.3,
                      max: 16.4,
                      onChanged: (value) {
                        setState(() {
                          _vehicleHeight = value;
                        });
                        _saveVehicleDimensions();
                      },
                    ),
                    const SizedBox(height: 24),

                    // Vehicle Width
                    _buildSectionTitle('Vehicle Width'),
                    const SizedBox(height: 12),
                    _buildDimensionSlider(
                      icon: Icons.swap_horiz,
                      value: _vehicleWidth,
                      min: 4.0,
                      max: 8.0,
                      onChanged: (value) {
                        setState(() {
                          _vehicleWidth = value;
                        });
                        _saveVehicleDimensions();
                      },
                    ),
                    const SizedBox(height: 24),

                    // Vehicle Length
                    _buildSectionTitle('Vehicle Length'),
                    const SizedBox(height: 12),
                    _buildDimensionSlider(
                      icon: Icons.straighten,
                      value: _vehicleLength,
                      min: 6.6,
                      max: 49.2,
                      onChanged: (value) {
                        setState(() {
                          _vehicleLength = value;
                        });
                        _saveVehicleDimensions();
                      },
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title.toUpperCase(),
      style: TextStyle(
        color: Colors.grey[600],
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.0,
      ),
    );
  }

  Widget _buildDimensionSlider({
    required IconData icon,
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(icon, color: lightBlue, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Slider(
                  value: value,
                  min: min,
                  max: max,
                  divisions: ((max - min) * 2).toInt(),
                  activeColor: lightBlue,
                  inactiveColor: lightBlue.withOpacity(0.2),
                  onChanged: onChanged,
                ),
              ),
              Container(
                width: 80,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: lightBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    _formatValue(value),
                    style: const TextStyle(
                      color: lightBlue,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
