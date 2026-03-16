import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class AdminHostRequestsScreen extends StatefulWidget {
  const AdminHostRequestsScreen({super.key});

  @override
  State<AdminHostRequestsScreen> createState() => _AdminHostRequestsScreenState();
}

class _AdminHostRequestsScreenState extends State<AdminHostRequestsScreen> {
  String _selectedFilter = 'All';
  final List<String> _filters = ['All', 'pending', 'confirmed', 'Completed', 'Cancelled'];
  List<Map<String, dynamic>> _bookings = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      debugPrint('[AdminBookings] Fetching all bookings...');
      final bookings = await ApiService.getAllBookings();
      debugPrint('[AdminBookings] Got ${bookings.length} bookings: ${bookings.map((b) => b['id']).toList()}');
      if (!mounted) return;
      setState(() {
        _bookings = List<Map<String, dynamic>>.from(bookings);
        _isLoading = false;
      });
    } catch (e, stack) {
      debugPrint('[AdminBookings] Error loading bookings: $e');
      debugPrint('[AdminBookings] Stack: $stack');
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get filteredBookings {
    if (_selectedFilter == 'All') return _bookings;
    return _bookings.where((b) {
      final status = (b['status'] ?? '').toString().toLowerCase();
      return status == _selectedFilter.toLowerCase();
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        toolbarHeight: 48,
        leading: const SizedBox.shrink(),
        title: RichText(
          text: const TextSpan(
            children: [
              TextSpan(
                text: 'All Bookings ',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              TextSpan(
                text: 'Admin',
                style: TextStyle(
                  color: Color(0xFF3B82F6),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: _filters.map((filter) {
                  final isSelected = _selectedFilter == filter;
                  final label = filter == 'All' ? 'All' : filter[0].toUpperCase() + filter.substring(1);
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedFilter = filter),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[100],
                          border: isSelected ? null : Border.all(color: const Color(0xFFE2E8F0), width: 1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          label,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.grey[700],
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          // Content
          if (!_isLoading && _error == null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '${_bookings.length} total bookings · ${filteredBookings.length} shown',
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),
            ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Colors.red),
                              const SizedBox(height: 16),
                              Text('Failed to load bookings', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              Text(_error!, style: TextStyle(color: Colors.grey[600], fontSize: 13), textAlign: TextAlign.center),
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                onPressed: _loadBookings,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : filteredBookings.isEmpty
                        ? _buildEmptyState()
                        : RefreshIndicator(
                            onRefresh: _loadBookings,
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: filteredBookings.length,
                              itemBuilder: (context, index) =>
                                  _buildBookingCard(filteredBookings[index]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.event_outlined,
              size: 50,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _selectedFilter == 'All'
                ? 'No bookings yet'
                : 'No ${_selectedFilter.toLowerCase()} bookings',
            style: const TextStyle(
              color: Colors.black,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Bookings will appear here when guests book',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> booking) {
    final status = (booking['status'] ?? 'pending').toString();
    final statusColor = _getStatusColor(status);
    final guestName = booking['guest_name'] ?? 'Unknown Guest';
    final guestEmail = booking['guest_email'] ?? '';
    final placeName = booking['place_name'] ?? 'Unknown Place';
    final hostName = booking['host_name'] ?? 'Unknown Host';
    final checkIn = _formatDate(booking['check_in_date']);
    final checkOut = _formatDate(booking['check_out_date']);
    final nights = booking['number_of_nights'] ?? '';
    final price = booking['total_price'] ?? '';
    final vanReg = booking['van_registration'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  placeName,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                child: Text(
                  status[0].toUpperCase() + status.substring(1),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Guest & Host
          _infoRow(Icons.person_outline, 'Guest: $guestName'),
          if (guestEmail.isNotEmpty) _infoRow(Icons.email_outlined, guestEmail),
          _infoRow(Icons.house_outlined, 'Host: $hostName'),
          const Divider(height: 16),
          // Dates
          _infoRow(Icons.calendar_today_outlined, '$checkIn  \u2192  $checkOut  ($nights nights)'),
          if (vanReg.isNotEmpty) _infoRow(Icons.directions_car_outlined, 'Van: $vanReg'),
          if (price.toString().isNotEmpty)
            _infoRow(Icons.payments_outlined, '\u00A3${_formatPrice(price)}'),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF94A3B8)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
          ),
        ],
      ),
    );
  }

  String _formatDate(dynamic dateVal) {
    if (dateVal == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateVal.toString());
      return DateFormat('d MMM yyyy').format(dt);
    } catch (_) {
      return dateVal.toString();
    }
  }

  String _formatPrice(dynamic price) {
    try {
      final p = double.parse(price.toString());
      return p.toStringAsFixed(2);
    } catch (_) {
      return price.toString();
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return const Color(0xFFF59E0B);
      case 'confirmed':
        return const Color(0xFF3B82F6);
      case 'completed':
        return const Color(0xFF10B981);
      case 'cancelled':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF94A3B8);
    }
  }
}
