import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../services/storage_service.dart';

class AdminBookingSearchScreen extends StatefulWidget {
  const AdminBookingSearchScreen({super.key});

  @override
  State<AdminBookingSearchScreen> createState() => _AdminBookingSearchScreenState();
}

class _AdminBookingSearchScreenState extends State<AdminBookingSearchScreen> {
  static const Color darkBlue = Color(0xFF3A6DB5);

  final _searchController = TextEditingController();
  List<Map<String, dynamic>> _results = [];
  bool _isLoading = false;
  bool _hasSearched = false;
  int _totalResults = 0;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) return;
    setState(() {
      _isLoading = true;
      _hasSearched = true;
    });

    try {
      final token = await StorageService.getToken();
      final uri = Uri.parse(
        '${AppConfig.properPlaceBackendUrl}/bookings/search?q=${Uri.encodeComponent(query.trim())}',
      );
      final resp = await http.get(uri, headers: {
        if (token != null) 'Authorization': 'Bearer $token',
      });

      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        final bookings = (data['bookings'] as List)
            .map((b) => b as Map<String, dynamic>)
            .toList();
        setState(() {
          _results = bookings;
          _totalResults = data['pagination']?['total'] ?? bookings.length;
        });
      } else {
        setState(() {
          _results = [];
          _totalResults = 0;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Search error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'N/A';
    try {
      final d = DateTime.parse(dateStr);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${d.day} ${months[d.month - 1]} ${d.year}';
    } catch (_) {
      return dateStr;
    }
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed': return Colors.green;
      case 'completed': return const Color(0xFF3A6DB5);
      case 'cancelled': return Colors.red;
      case 'pending': return Colors.orange;
      default: return Colors.grey;
    }
  }

  void _showBookingDetail(Map<String, dynamic> booking) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollController) => _BookingDetailSheet(
          booking: booking,
          scrollController: scrollController,
          formatDate: _formatDate,
          statusColor: _statusColor,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Booking Search', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by reference, guest name, email, or site...',
                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                prefixIcon: const Icon(Icons.search, color: darkBlue),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _results = [];
                            _hasSearched = false;
                          });
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              textInputAction: TextInputAction.search,
              onSubmitted: _search,
              onChanged: (_) => setState(() {}),
            ),
          ),

          // Results count
          if (_hasSearched && !_isLoading)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.grey[100],
              child: Text(
                '$_totalResults result${_totalResults == 1 ? '' : 's'} found',
                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
              ),
            ),

          // Results
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: darkBlue))
                : !_hasSearched
                    ? _buildEmptyPrompt()
                    : _results.isEmpty
                        ? _buildNoResults()
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _results.length,
                            itemBuilder: (context, index) => _buildResultCard(_results[index]),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyPrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Search Bookings',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Enter a booking reference (e.g. PP-260326-A1B2), '
              'guest name, email address, or site name.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoResults() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 56, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'No bookings found',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Try a different reference, name, or email address.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultCard(Map<String, dynamic> booking) {
    final ref = booking['booking_ref'] ?? '#${booking['id']}';
    final guestName = booking['guest_name'] ?? 'Unknown Guest';
    final placeName = booking['place_name'] ?? 'Unknown Site';
    final status = booking['status'] ?? 'unknown';
    final checkIn = _formatDate(booking['check_in_date']?.toString());
    final checkOut = _formatDate(booking['check_out_date']?.toString());
    final price = booking['total_price'];

    return GestureDetector(
      onTap: () => _showBookingDetail(booking),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    ref,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: darkBlue,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _statusColor(status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: _statusColor(status),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(Icons.person_outline, size: 16, color: Colors.grey[500]),
                  const SizedBox(width: 6),
                  Text(guestName, style: TextStyle(fontSize: 14, color: Colors.grey[700])),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.location_on_outlined, size: 16, color: Colors.grey[500]),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(placeName, style: TextStyle(fontSize: 14, color: Colors.grey[700]), overflow: TextOverflow.ellipsis),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '$checkIn → $checkOut',
                    style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                  ),
                  if (price != null)
                    Text(
                      '£${double.tryParse(price.toString())?.toStringAsFixed(2) ?? price}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Full booking detail shown as a bottom sheet
class _BookingDetailSheet extends StatelessWidget {
  final Map<String, dynamic> booking;
  final ScrollController scrollController;
  final String Function(String?) formatDate;
  final Color Function(String) statusColor;

  const _BookingDetailSheet({
    required this.booking,
    required this.scrollController,
    required this.formatDate,
    required this.statusColor,
  });

  @override
  Widget build(BuildContext context) {
    final ref = booking['booking_ref'] ?? '#${booking['id']}';
    final status = booking['status'] ?? 'unknown';
    final guestName = booking['guest_name'] ?? 'Unknown';
    final guestEmail = booking['guest_email'] ?? '-';
    final guestPhone = booking['guest_phone'] ?? booking['contact_phone'] ?? '-';
    final placeName = booking['place_name'] ?? 'Unknown';
    final placeAddress = booking['place_address'] ?? '-';
    final hostName = booking['host_name'] ?? '-';
    final hostEmail = booking['host_email'] ?? '-';
    final checkIn = formatDate(booking['check_in_date']?.toString());
    final checkOut = formatDate(booking['check_out_date']?.toString());
    final checkInTime = booking['check_in_time'] ?? '12:00';
    final checkOutTime = booking['check_out_time'] ?? '12:00';
    final nights = booking['number_of_nights'] ?? '-';
    final price = booking['total_price'];
    final earlyFee = booking['early_checkin_fee'];
    final lateFee = booking['late_checkout_fee'];
    final vanReg = booking['van_registration'] ?? '-';
    final specialReqs = booking['special_requests'] ?? '-';
    final createdAt = formatDate(booking['created_at']?.toString());

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: ListView(
        controller: scrollController,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header: ref + status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Booking Reference', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 2),
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: ref));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Reference copied'), duration: Duration(seconds: 1)),
                      );
                    },
                    child: Row(
                      children: [
                        Text(ref, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF3A6DB5))),
                        const SizedBox(width: 6),
                        const Icon(Icons.copy, size: 16, color: Colors.grey),
                      ],
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor(status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: statusColor(status)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Guest info
          _sectionTitle('Guest Information'),
          _infoRow('Name', guestName),
          _infoRow('Email', guestEmail),
          _infoRow('Phone', guestPhone),
          _infoRow('Van Registration', vanReg),

          const SizedBox(height: 20),

          // Site info
          _sectionTitle('Site Information'),
          _infoRow('Site', placeName),
          _infoRow('Address', placeAddress),
          _infoRow('Host', hostName),
          _infoRow('Host Email', hostEmail),

          const SizedBox(height: 20),

          // Booking details
          _sectionTitle('Booking Details'),
          _infoRow('Check-in', '$checkIn at $checkInTime'),
          _infoRow('Check-out', '$checkOut at $checkOutTime'),
          _infoRow('Nights', '$nights'),
          if (price != null)
            _infoRow('Total Price', '£${double.tryParse(price.toString())?.toStringAsFixed(2) ?? price}'),
          if (earlyFee != null && double.tryParse(earlyFee.toString()) != 0)
            _infoRow('Early Check-in Fee', '£${double.tryParse(earlyFee.toString())?.toStringAsFixed(2)}'),
          if (lateFee != null && double.tryParse(lateFee.toString()) != 0)
            _infoRow('Late Check-out Fee', '£${double.tryParse(lateFee.toString())?.toStringAsFixed(2)}'),

          const SizedBox(height: 20),

          // Special requests
          if (specialReqs != '-') ...[
            _sectionTitle('Special Requests'),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
              ),
              child: Text(specialReqs, style: const TextStyle(fontSize: 14)),
            ),
            const SizedBox(height: 20),
          ],

          // Meta
          _infoRow('Booked On', createdAt),
          _infoRow('Booking ID', '${booking['id']}'),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(label, style: TextStyle(fontSize: 14, color: Colors.grey[600])),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
