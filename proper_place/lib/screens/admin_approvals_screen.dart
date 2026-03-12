import 'package:flutter/material.dart';
import '../models/place.dart';
import '../services/api_service.dart';
import 'admin_approval_detail_screen.dart';

class AdminApprovalsScreen extends StatefulWidget {
  final VoidCallback? onRefresh;
  
  const AdminApprovalsScreen({super.key, this.onRefresh});

  @override
  State<AdminApprovalsScreen> createState() => _AdminApprovalsScreenState();
}

class _AdminApprovalsScreenState extends State<AdminApprovalsScreen> {
  String _selectedFilter = 'Pending';
  final Set<String> _expandedApprovedPlaces = {}; // Track which approved places are expanded
  
  List<Map<String, dynamic>> _pendingPlaces = [];
  List<Map<String, dynamic>> _approvedPlaces = [];
  List<Map<String, dynamic>> _rejectedPlaces = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAllCounts();
  }

  /// Load counts for all filters upfront, then load details for current filter
  Future<void> _loadAllCounts() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });
      
      // Load all categories in parallel to get accurate counts
      final results = await Future.wait([
        ApiService.getPendingPlaces(),
        ApiService.getAdminApprovedPlaces(),
        ApiService.getAdminRejectedPlaces(),
      ]);
      
      setState(() {
        _pendingPlaces = _mapPlaces(results[0], 'Pending');
        _approvedPlaces = _mapPlaces(results[1], 'Approved');
        _rejectedPlaces = _mapPlaces(results[2], 'Rejected');
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading places: $e');
      setState(() {
        _error = 'Failed to load places: $e';
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> _mapPlaces(List places, String status) {
    return places.map((place) {
      return {
        'id': place['place_id'] ?? place['id'] ?? '',
        'name': place['name'] ?? 'Unnamed Place',
        'address': place['address'] ?? '',
        'hostName': place['host_name'] ?? place['owner_name'] ?? 'Unknown Host',
        'hostEmail': place['host_email'] ?? place['owner_email'] ?? '',
        'host_total_sites': place['host_total_sites'] ?? 0,
        'host_approved_sites': place['host_approved_sites'] ?? 0,
        'host_joined_at': place['host_joined_at'] ?? '',
        'image': place['image_url'] ?? place['image'] ?? '',
        'status': status,
        'submissionDate': place['submitted_at'] ?? place['created_at'] ?? '',
        'description': place['description'] ?? '',
        'amenities': (place['amenities'] is List) ? place['amenities'] : [],
        'raw': place,
      };
    }).toList();
  }

  List<Map<String, dynamic>> get _filteredPlaces {
    if (_selectedFilter == 'Pending') {
      return _pendingPlaces;
    } else if (_selectedFilter == 'Approved') {
      return _approvedPlaces;
    } else if (_selectedFilter == 'Rejected') {
      return _rejectedPlaces;
    }
    // 'All' - combine all lists
    return [..._pendingPlaces, ..._approvedPlaces, ..._rejectedPlaces];
  }

  int get _pendingCount => _pendingPlaces.length;
  int get _approvedCount => _approvedPlaces.length;
  int get _rejectedCount => _rejectedPlaces.length;

  void _showApproveDialog(Map<String, dynamic> place) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Approve Place?'),
        content: Text(
          'Are you sure you want to approve "${place['name']}" from ${place['hostName']}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ApiService.approvePlace(placeId: place['id']);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${place['name']} approved successfully')),
                );
                // Refresh all lists and notification counts
                _loadAllCounts();
                widget.onRefresh?.call();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to approve: $e'), backgroundColor: Colors.red),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
            ),
            child: const Text('Approve'),
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(Map<String, dynamic> place) {
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Place'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Are you sure you want to reject "${place['name']}" from ${place['hostName']}?',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Optional: Reason for rejection',
                  hintStyle: TextStyle(color: Colors.grey[700]),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ApiService.rejectPlace(
                  placeId: place['id'],
                  reason: reasonController.text,
                );
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${place['name']} rejected')),
                );
                // Refresh all lists and notification counts
                _loadAllCounts();
                widget.onRefresh?.call();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to reject: $e'), backgroundColor: Colors.red),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  void _showContactHostOptions(Map<String, dynamic> place) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Contact Host'),
        content: Text(
          'Host: ${place['hostName']}\nEmail: ${place['hostEmail']}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Email compose for ${place['hostEmail']} would open'),
                ),
              );
            },
            icon: const Icon(Icons.mail),
            label: const Text('Send Email'),
          ),
        ],
      ),
    );
  }

  void _showFullPlaceDetailsModal(Map<String, dynamic> place) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => FractionallySizedBox(
        heightFactor: 0.8,
        child: Container(
          padding: const EdgeInsets.only(top: 20, left: 20, right: 20, bottom: 20),
          child: ListView(
            shrinkWrap: true,
            children: [
            // Header with title
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    place['name'],
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Icon(Icons.close, size: 28),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Status badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: place['status'] == 'Approved'
                    ? Colors.green
                    : place['status'] == 'Rejected'
                        ? Colors.red
                        : Colors.amber,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                place['status'],
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Image
            if (place['image'] != null && place['image'].isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  Place.toFullImageUrl(place['image']) ?? '',
                  height: 250,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 250,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.image_not_supported, size: 64),
                    );
                  },
                ),
              ),
            const SizedBox(height: 16),

            // Address
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on, color: Color(0xFF3B82F6), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    place['address'],
                    style: TextStyle(color: Colors.grey[700], fontSize: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Host Information
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Host Information',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Name: ${place['hostName']}',
                    style: TextStyle(color: Colors.grey[700], fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Email: ${place['hostEmail']}',
                    style: TextStyle(color: Colors.grey[700], fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Submitted: ${place['submissionDate']}',
                    style: TextStyle(color: Colors.grey[700], fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Description
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Description',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  place['description'] ?? 'No description provided',
                  style: TextStyle(color: Colors.grey[700], fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Business Description (if provided)
            if (place['business_description'] != null && 
                place['business_description'].toString().isNotEmpty)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Business Description',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFED7AA)),
                    ),
                    child: Text(
                      place['business_description'],
                      style: TextStyle(color: Colors.grey[700], fontSize: 13),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),

            // Amenities
            if (place['amenities'] != null && (place['amenities'] as List).isNotEmpty)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Amenities',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: (place['amenities'] as List)
                        .map<Widget>(
                          (amenity) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE0E7FF),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              amenity,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF4F46E5),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ),
            const SizedBox(height: 24),

            // Action buttons (only for Pending)
            if (place['status'] == 'Pending')
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _showRejectDialog(place);
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                      ),
                      child: const Text(
                        'Reject',
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _showApproveDialog(place);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                      ),
                      child: const Text('Approve'),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 16),
            
            // Contact Host button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  // Show contact options or launch email
                  _showContactHostOptions(place);
                },
                icon: const Icon(Icons.mail_outline),
                label: const Text('Contact Host'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
      ),
    );
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
                text: 'Proper Place ',
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
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadAllCounts,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : Column(
                    children: [
                      // Filter Tabs
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              _buildFilterTab('Pending', _pendingCount),
                              const SizedBox(width: 8),
                              _buildFilterTab('Approved', _approvedCount),
                              const SizedBox(width: 8),
                              _buildFilterTab('Rejected', _rejectedCount),
                              const SizedBox(width: 8),
                              _buildFilterTab('All', _pendingCount + _approvedCount + _rejectedCount),
                            ],
                          ),
                        ),
                      ),
                      // Places List or Empty State
                      Expanded(
                        child: _filteredPlaces.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(24),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFE0E7FF),
                                        borderRadius: BorderRadius.circular(50),
                                      ),
                                      child: const Icon(
                                        Icons.check_circle,
                                        color: Color(0xFF4F46E5),
                                        size: 64,
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    const Text(
                                      'All caught up!',
                                      style: TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'No ${_selectedFilter.toLowerCase()} places to review at the moment.',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey[600],
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _filteredPlaces.length,
                                itemBuilder: (context, index) {
                                  final place = _filteredPlaces[index];
                                  // Use collapsible card for all places
                                  return _buildCollapsiblePlaceCard(place);
                                },
                              ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildFilterTab(String label, int count) {
    final isSelected = _selectedFilter == label;
    return GestureDetector(
      onTap: () {
        if (_selectedFilter != label) {
          setState(() => _selectedFilter = label);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[100],
          border: isSelected ? null : Border.all(color: const Color(0xFFE2E8F0), width: 1),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '$label ($count)',
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.grey[700],
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCollapsiblePlaceCard(Map<String, dynamic> place) {
    final hostTotalSites = place['host_total_sites'] ?? place['raw']?['host_total_sites'] ?? 0;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AdminApprovalDetailScreen(
                place: place,
                onApproved: () {
                  _loadAllCounts();
                  widget.onRefresh?.call();
                },
                onRejected: () {
                  _loadAllCounts();
                  widget.onRefresh?.call();
                },
              ),
            ),
          );
          // Refresh list if action was taken
          if (result == true) {
            _loadAllCounts();
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: place['status'] == 'Approved'
                      ? Colors.green
                      : place['status'] == 'Rejected'
                          ? Colors.red
                          : Colors.amber,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  place['status'],
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      place['name'],
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      place['hostName'],
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                    if (hostTotalSites > 0) ...[
                      const SizedBox(height: 4),
                      Text(
                        '$hostTotalSites site${hostTotalSites == 1 ? '' : 's'} total',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: Colors.grey[600],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Keep legacy expanded content for backwards compatibility (no longer used)
  List<Widget> _buildExpandedContentLegacy(Map<String, dynamic> place) {
    return [
      // Place Image Placeholder
      Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.grey[300]!, Colors.grey[400]!],
          ),
        ),
        child: const Center(
          child: Icon(Icons.image, size: 64, color: Colors.grey),
        ),
      ),
      // Place Details
      Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.location_on, size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    place['address'],
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Host: ${place['hostName']}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    place['hostEmail'],
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              place['description'],
              style: TextStyle(color: Colors.grey[700], fontSize: 13),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: place['amenities']
                  .map<Widget>(
                    (amenity) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0E7FF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        amenity,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF4F46E5),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 16),
            // Action Buttons (only for Pending)
            if (place['status'] == 'Pending')
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _showRejectDialog(place),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                      ),
                      child: const Text(
                        'Reject',
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _showApproveDialog(place),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                      ),
                      child: const Text('Approve'),
                    ),
                  ),
                ],
              ),
            if (place['status'] == 'Pending')
              const SizedBox(height: 12),
            // View Full Details Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _showFullPlaceDetailsModal(place),
                icon: const Icon(Icons.open_in_full),
                label: const Text('View Full Details'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    ];
  }
}
