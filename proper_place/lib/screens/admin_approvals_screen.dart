import 'package:flutter/material.dart';

class AdminApprovalsScreen extends StatefulWidget {
  final VoidCallback? onRefresh;
  
  const AdminApprovalsScreen({super.key, this.onRefresh});

  @override
  State<AdminApprovalsScreen> createState() => _AdminApprovalsScreenState();
}

class _AdminApprovalsScreenState extends State<AdminApprovalsScreen> {
  String _selectedFilter = 'Pending';
  final Set<String> _expandedApprovedPlaces = {}; // Track which approved places are expanded

  // Sample place submissions data
  final List<Map<String, dynamic>> _allPlaces = [
    {
      'id': '1',
      'name': 'Cozy Mountain Cabin',
      'address': '123 Mountain Rd, Colorado',
      'hostName': 'John Smith',
      'hostEmail': 'john@example.com',
      'image':
          'https://images.unsplash.com/photo-1520763185298-1b434c919abe?w=400&h=300&fit=crop',
      'status': 'Pending',
      'submissionDate': '2025-01-20',
      'description':
          'Beautiful mountain cabin with views, fully equipped kitchen',
      'amenities': ['WiFi', 'Heating', 'Kitchen', 'Bathroom'],
    },
    {
      'id': '2',
      'name': 'Desert Glamping',
      'address': '456 Desert Lane, Arizona',
      'hostName': 'Sarah Johnson',
      'hostEmail': 'sarah@example.com',
      'image':
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      'status': 'Approved',
      'submissionDate': '2025-01-15',
      'description': 'Luxury glamping experience in the desert',
      'amenities': ['Heating', 'Star views', 'Outdoor shower'],
    },
    {
      'id': '3',
      'name': 'Lake House Retreat',
      'address': '789 Lake View, Michigan',
      'hostName': 'Michael Chen',
      'hostEmail': 'michael@example.com',
      'image':
          'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
      'status': 'Approved',
      'submissionDate': '2025-01-10',
      'description': 'Stunning lakefront property with private dock',
      'amenities': ['WiFi', 'Kitchen', 'Dock', 'Fireplace'],
    },
    {
      'id': '4',
      'name': 'City Loft',
      'address': '321 Urban St, New York',
      'hostName': 'Emma Davis',
      'hostEmail': 'emma@example.com',
      'image':
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
      'status': 'Pending',
      'submissionDate': '2025-01-18',
      'description': 'Modern loft in the heart of the city',
      'amenities': ['WiFi', 'AC', 'Elevator'],
    },
  ];

  List<Map<String, dynamic>> get _filteredPlaces {
    if (_selectedFilter == 'All') {
      return _allPlaces;
    }
    return _allPlaces
        .where((place) => place['status'] == _selectedFilter)
        .toList();
  }

  int get _pendingCount =>
      _allPlaces.where((p) => p['status'] == 'Pending').length;
  int get _approvedCount =>
      _allPlaces.where((p) => p['status'] == 'Approved').length;
  int get _rejectedCount =>
      _allPlaces.where((p) => p['status'] == 'Rejected').length;

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
            onPressed: () {
              setState(() {
                place['status'] = 'Approved';
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Place approved successfully')),
              );
              // Refresh notification counts after approval
              widget.onRefresh?.call();
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
            onPressed: () {
              setState(() {
                place['status'] = 'Rejected';
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Place rejected')),
              );
              // Refresh notification counts after rejection
              widget.onRefresh?.call();
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
        child: Column(
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
                    _buildFilterTab('All', _allPlaces.length),
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
                        // Use collapsed card for approved places on Approved tab
                        if (_selectedFilter == 'Approved' && place['status'] == 'Approved') {
                          return _buildCollapsiblePlaceCard(place);
                        }
                        return _buildPlaceCard(place);
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
      onTap: () => setState(() => _selectedFilter = label),
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

  Widget _buildPlaceCard(Map<String, dynamic> place) {
    final statusColor = place['status'] == 'Approved'
        ? Colors.green
        : place['status'] == 'Rejected'
            ? Colors.red
            : Colors.amber;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          // Place Image Placeholder
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
                child: Container(
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
              ),
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor,
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
              ),
            ],
          ),
          // Place Details
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  place['name'],
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
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
              ],
            ),
          ),
          // Action Buttons (only for Pending)
          if (place['status'] == 'Pending')
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
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
            ),
        ],
      ),
    );
  }

  Widget _buildCollapsiblePlaceCard(Map<String, dynamic> place) {
    final isExpanded = _expandedApprovedPlaces.contains(place['id']);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          // Header - always visible
          GestureDetector(
            onTap: () {
              setState(() {
                if (isExpanded) {
                  _expandedApprovedPlaces.remove(place['id']);
                } else {
                  _expandedApprovedPlaces.add(place['id']);
                }
              });
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: isExpanded 
                    ? const BorderRadius.only(
                        topLeft: Radius.circular(12),
                        topRight: Radius.circular(12),
                      )
                    : BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Approved',
                      style: TextStyle(
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
                      ],
                    ),
                  ),
                  Transform.rotate(
                    angle: isExpanded ? 1.5708 : 0, // 90 degrees when expanded
                    child: Icon(
                      Icons.chevron_right,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Expanded content
          if (isExpanded) ..._buildExpandedContent(place),
        ],
      ),
    );
  }

  List<Widget> _buildExpandedContent(Map<String, dynamic> place) {
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
          ],
        ),
      ),
    ];
  }
}
