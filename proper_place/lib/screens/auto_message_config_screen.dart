import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class AutoMessageConfigScreen extends StatefulWidget {
  final int placeId;
  final String placeName;

  const AutoMessageConfigScreen({
    super.key,
    required this.placeId,
    required this.placeName,
  });

  @override
  State<AutoMessageConfigScreen> createState() => _AutoMessageConfigScreenState();
}

class _AutoMessageConfigScreenState extends State<AutoMessageConfigScreen> {
  bool _isLoading = true;
  bool _isSaving = false;

  // Template data for each trigger type
  final Map<String, _TemplateData> _templates = {
    'on_booking': _TemplateData(
      label: 'When Booking is Made',
      description: 'Sent immediately after a guest books your site.',
      icon: Icons.calendar_today,
      defaultMessage: 'Thank you for booking! We look forward to hosting you.',
    ),
    '24h_before_checkin': _TemplateData(
      label: '24 Hours Before Check-in',
      description: 'Sent 24 hours before the guest\'s check-in date.',
      icon: Icons.access_time,
      defaultMessage: 'Reminder: Your stay begins tomorrow. See you soon!',
    ),
    '1h_before_arrival': _TemplateData(
      label: '1 Hour Before Arrival',
      description: 'Sent 1 hour before the estimated arrival time.',
      icon: Icons.directions_car,
      defaultMessage: 'Almost here! Let us know if you need any help finding us.',
    ),
    'at_checkout': _TemplateData(
      label: 'At Checkout',
      description: 'Sent when checkout time arrives.',
      icon: Icons.logout,
      defaultMessage: 'Thank you for visiting! We hope you enjoyed your stay. Safe travels!',
    ),
  };

  @override
  void initState() {
    super.initState();
    _loadTemplates();
  }

  Future<void> _loadTemplates() async {
    try {
      final response = await ApiService.getAutoMessageTemplates(placeId: widget.placeId);
      final templates = response['templates'] as List<dynamic>? ?? [];

      for (final t in templates) {
        final triggerType = t['trigger_type'] as String?;
        if (triggerType != null && _templates.containsKey(triggerType)) {
          _templates[triggerType]!.enabled = t['enabled'] == true;
          _templates[triggerType]!.controller.text = t['message_content'] ?? '';
        }
      }
    } catch (e) {
      // First time - no templates yet, that's fine
      debugPrint('Auto-message templates load: $e');
    }
    setState(() => _isLoading = false);
  }

  Future<void> _saveTemplates() async {
    setState(() => _isSaving = true);
    try {
      final templateList = _templates.entries.map((entry) {
        return <String, dynamic>{
          'trigger_type': entry.key,
          'message_content': entry.value.controller.text.trim(),
          'enabled': entry.value.enabled,
        };
      }).toList();

      await ApiService.saveAutoMessageTemplates(
        placeId: widget.placeId,
        templates: templateList,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Auto-messages saved successfully'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
    setState(() => _isSaving = false);
  }

  @override
  void dispose() {
    for (final t in _templates.values) {
      t.controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        iconTheme: const IconThemeData(color: Color(0xFF1A1A2E)),
        title: const Text(
          'Auto Messages',
          style: TextStyle(
            color: Color(0xFF1A1A2E),
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: const Color(0xFFE8E8E8),
            height: 1,
          ),
        ),
      ),
      backgroundColor: const Color(0xFFF8F9FA),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        // Info card
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.info_outline, color: Color(0xFF3B82F6), size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Configure automatic messages that will be sent to guests via chat at key moments during their booking.',
                                  style: TextStyle(
                                    color: const Color(0xFF1E40AF),
                                    fontSize: 13,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        // Template cards
                        ..._templates.entries.map((entry) => _buildTemplateCard(entry.key, entry.value)),
                      ],
                    ),
                  ),
                  // Save button
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Color(0xFFE8E8E8))),
                    ),
                    child: SafeArea(
                      top: false,
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isSaving ? null : _saveTemplates,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1A1A2E),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _isSaving
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text(
                                  'Save Auto Messages',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildTemplateCard(String triggerType, _TemplateData data) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: data.enabled ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with toggle
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
            child: Row(
              children: [
                Icon(data.icon, size: 20, color: data.enabled ? const Color(0xFF10B981) : const Color(0xFF9CA3AF)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    data.label,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: data.enabled ? const Color(0xFF1A1A2E) : const Color(0xFF6B7280),
                    ),
                  ),
                ),
                Switch(
                  value: data.enabled,
                  onChanged: (val) => setState(() => data.enabled = val),
                  activeColor: const Color(0xFF10B981),
                ),
              ],
            ),
          ),
          // Description
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              data.description,
              style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
            ),
          ),
          // Message field (only if enabled)
          if (data.enabled) ...[
            const Divider(height: 1, color: Color(0xFFF3F4F6)),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: data.controller,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: data.defaultMessage,
                  hintStyle: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 14),
                  filled: true,
                  fillColor: const Color(0xFFF9FAFB),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.all(12),
                ),
                style: const TextStyle(fontSize: 14, height: 1.4),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TemplateData {
  final String label;
  final String description;
  final IconData icon;
  final String defaultMessage;
  bool enabled;
  final TextEditingController controller;

  _TemplateData({
    required this.label,
    required this.description,
    required this.icon,
    required this.defaultMessage,
    this.enabled = false,
  }) : controller = TextEditingController();
}
