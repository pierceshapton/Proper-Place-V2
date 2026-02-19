import 'package:flutter/material.dart';
import 'host_create_site_screen.dart';
import '../services/place_service.dart';
import '../config/app_config.dart';

class MyPlacesHostScreen extends StatefulWidget {
  const MyPlacesHostScreen({super.key});

  @override
  State<MyPlacesHostScreen> createState() => _MyPlacesHostScreenState();
}

class _MyPlacesHostScreenState extends State<MyPlacesHostScreen> {
  List<Map<String, dynamic>> hostPlaces = [];
  bool _isLoading = true;

  // Status mapping for display
  static const Map<String, Map<String, dynamic>> _statusConfig = {
    'draft': {'label': 'Drafting', 'color': Color(0xFF6B7280), 'icon': Icons.edit_outlined},
    'pending': {'label': 'Pending', 'color': Color(0xFFF59E0B), 'icon': Icons.schedule},
    'approved': {'label': 'Approved', 'color': Color(0xFF10B981), 'icon': Icons.check_circle},
    'rejected': {'label': 'Rejected', 'color': Color(0xFFEF4444), 'icon': Icons.cancel},
  };

  @override
  void initState() {
    super.initState();
    _loadPlaces();
  }

  Future<void> _loadPlaces() async {
    try {
      setState(() => _isLoading = true);
      final places = await PlaceService.getHostPlaces();
      print('DEBUG: Loaded ${places.length} places');
      setState(() {
        hostPlaces = places.map<Map<String, dynamic>>((place) {
          final status = place['approval_status'] ?? 'pending';
          final config = _statusConfig[status] ?? _statusConfig['pending']!;
          
          // Debug: print image data
          print('DEBUG: Place ${place['name']} - images field: ${place['images']}');
          
          // Build full image URL from relative path
          String imageUrl = 'https://via.placeholder.com/400x300';
          if (place['images'] != null && place['images'] is List && (place['images'] as List).isNotEmpty) {
            final imgPath = place['images'][0];
            print('DEBUG: imgPath = $imgPath');
            if (imgPath.startsWith('http')) {
              imageUrl = imgPath;
            } else {
              // Prepend API base URL for relative paths
              imageUrl = '${AppConfig.properPlaceBackendUrl}$imgPath';
            }
            print('DEBUG: Final imageUrl = $imageUrl');
          } else {
            print('DEBUG: No images found, using placeholder');
          }
          
          return {
            'id': place['id'],
            'name': place['name'] ?? 'Unnamed Place',
            'address': place['address'] ?? '',
            'image': imageUrl,
            'status': config['label'],
            'statusColor': config['color'],
            'statusIcon': config['icon'],
            'approval_status': status,
            'rawData': place, // Keep full data for editing
          };
        }).toList();
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading places: $e');
      setState(() => _isLoading = false);
    }
  }

  // Sample reviews data
  final List<Map<String, dynamic>> allReviews = [
    {
      'id': '1',
      'guestName': 'Alice Johnson',
      'placeName': 'Avalon',
      'rating': 5,
      'date': '6 Feb 2026',
      'reviewText': 'Absolutely amazing place! The views were stunning and hosts were very welcoming.',
      'hasResponse': true,
      'response': 'Thank you so much Alice! We loved having you stay with us.',
    },
    {
      'id': '2',
      'guestName': 'Bob Wilson',
      'placeName': 'Coastal Haven',
      'rating': 4,
      'date': '4 Feb 2026',
      'reviewText': 'Great location and comfortable accommodations. Minor issue with WiFi but overall excellent.',
      'hasResponse': false,
      'response': '',
    },
    {
      'id': '3',
      'guestName': 'Carol Davis',
      'placeName': 'Avalon',
      'rating': 5,
      'date': '2 Feb 2026',
      'reviewText': 'Perfect weekend getaway! Everything was clean and well-organized.',
      'hasResponse': false,
      'response': '',
    },
  ];

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
                text: 'Host',
                style: TextStyle(
                  color: Color(0xFF7BA7D8),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: GestureDetector(
                onTap: () async {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const HostCreateSiteScreen(),
                    ),
                  );
                  // Refresh list if a place was saved
                  if (result == true) {
                    _loadPlaces();
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add, size: 18, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Add Site',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Title section
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'My Places',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${hostPlaces.length} places listed',
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Empty state or Place cards
          if (hostPlaces.isEmpty)
            _buildEmptyState()
          else
            ...hostPlaces.map((place) => _buildPlaceCard(place)),
          
          const SizedBox(height: 32),

          // Reviews Section
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Reviews',
                        style: TextStyle(
                          color: Colors.black,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${allReviews.length} reviews from guests',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF08A),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.star, size: 16, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 4),
                        Text(
                          '${_calculateAverageRating().toStringAsFixed(1)}',
                          style: const TextStyle(
                            color: Colors.black,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
          
          // Reviews list
          ...allReviews.map((review) => _buildReviewCard(review)),
        ],
      ),
    );
  }

  double _calculateAverageRating() {
    if (allReviews.isEmpty) return 0;
    final total = allReviews.fold<int>(0, (sum, review) => sum + (review['rating'] as int));
    return total / allReviews.length;
  }

  Widget _buildReviewCard(Map<String, dynamic> review) {
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
          // Header: Guest name and rating
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    review['guestName'],
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    review['placeName'],
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              Row(
                children: List.generate(5, (index) {
                  final filled = index < review['rating'];
                  return Icon(
                    filled ? Icons.star : Icons.star_outline,
                    size: 16,
                    color: const Color(0xFFF59E0B),
                  );
                }),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Date
          Text(
            'Stayed ${review['date']}',
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 12),

          // Review text
          Text(
            review['reviewText'],
            style: const TextStyle(
              color: Colors.black,
              fontSize: 13,
              fontWeight: FontWeight.w500,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 12),

          // Response section or respond button
          if (review['hasResponse'])
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Your response:',
                    style: TextStyle(
                      color: Color(0xFF1E40AF),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    review['response'],
                    style: const TextStyle(
                      color: Color(0xFF1E3A8A),
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            )
          else
            OutlinedButton.icon(
              onPressed: () {
                _showReplyDialog(review);
              },
              icon: const Icon(Icons.reply, size: 16),
              label: const Text('Respond to Review'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF7BA7D8),
                side: const BorderSide(color: Color(0xFF7BA7D8)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showReplyDialog(Map<String, dynamic> review) {
    final TextEditingController responseController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Respond to Review'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'From: ${review['guestName']}',
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                review['reviewText'],
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: responseController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Type your response...',
                hintStyle: TextStyle(color: Colors.grey[700]),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (responseController.text.trim().isNotEmpty) {
                setState(() {
                  review['hasResponse'] = true;
                  review['response'] = responseController.text;
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Response posted!')),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7BA7D8),
            ),
            child: const Text('Post Response'),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceCard(Map<String, dynamic> place) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image with status badge
          Stack(
            children: [
              // Image
              Container(
                width: double.infinity,
                height: 200,
                color: const Color(0xFFE2E8F0),
                child: Image.network(
                  place['image'],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: const Color(0xFFE2E8F0),
                      child: const Icon(Icons.image_not_supported),
                    );
                  },
                ),
              ),
              // Status badge
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  decoration: BoxDecoration(
                    color: place['statusColor'],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        place['statusIcon'] ?? Icons.check_circle,
                        size: 16,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        place['status'],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Text(
                  place['name'],
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),

                // Address
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 20,
                      color: Color(0xFF3B82F6),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        place['address'],
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final approvalStatus = place['approval_status'];
                          if (approvalStatus == 'draft' || approvalStatus == 'pending') {
                            // Use full create/edit form for draft and pending sites
                            final result = await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => HostCreateSiteScreen(
                                  siteToEdit: place['rawData'],
                                ),
                              ),
                            );
                            if (result == true) {
                              _loadPlaces();
                            }
                          } else {
                            // Use simple edit form for approved sites
                            Navigator.pushNamed(
                              context,
                              '/host_submit_place',
                              arguments: place,
                            );
                          }
                        },
                        icon: const Icon(Icons.edit, size: 18),
                        label: const Text('Edit'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black,
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          _showSetUnavailableDialog(context, place);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black,
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Set Unavailable'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showSetUnavailableDialog(BuildContext context, Map<String, dynamic> place) {
    final isApproved = place['approval_status'] == 'approved';
    final placeName = place['name'] ?? 'Your site';

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Set Unavailable'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Are you sure you want to set $placeName as unavailable?',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                ),
                if (isApproved) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFEF4444), width: 1),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '⚠️ Important',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFEF4444),
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'All bookings during this unavailable period will be CANCELLED and guests will be REFUNDED automatically.',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF374151),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                _showDateSelectionDialog(context, place, isApproved);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
              ),
              child: const Text('Continue', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  void _showDateSelectionDialog(
    BuildContext context,
    Map<String, dynamic> place,
    bool isApproved,
  ) {
    final placeName = place['name'] ?? 'Your site';
    final placeId = place['id'];
    DateTime? selectedStartDate;
    DateTime? selectedEndDate;
    bool isIndefinite = false;

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Unavailability Dates'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Select the dates when $placeName will be unavailable:',
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 20),
                Text(
                  'Select unavailability option:',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 16),

                // Date range section
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isIndefinite ? Colors.grey[300]! : const Color(0xFFE2E8F0),
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: isIndefinite ? Colors.grey[50] : Colors.white,
                  ),
                  child: Column(
                    children: [
                      // Start date picker
                      GestureDetector(
                        onTap: isIndefinite
                            ? null
                            : () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: selectedStartDate ?? DateTime.now(),
                                  firstDate: DateTime.now(),
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                );
                                if (picked != null) {
                                  setState(() => selectedStartDate = picked);
                                }
                              },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            borderRadius: BorderRadius.circular(8),
                            color: isIndefinite ? Colors.grey[100] : Colors.white,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                selectedStartDate == null
                                    ? 'Select start date'
                                    : 'Start: ${selectedStartDate!.toString().split(' ')[0]}',
                                style: TextStyle(
                                  color: isIndefinite
                                      ? Colors.grey
                                      : (selectedStartDate == null ? Colors.grey : Colors.black),
                                ),
                              ),
                              Icon(Icons.calendar_today,
                                  size: 18,
                                  color: isIndefinite ? Colors.grey[400] : const Color(0xFF3B82F6)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // End date picker
                      GestureDetector(
                        onTap: isIndefinite || selectedStartDate == null
                            ? null
                            : () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: selectedEndDate ?? selectedStartDate!.add(const Duration(days: 1)),
                                  firstDate: selectedStartDate!,
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                );
                                if (picked != null) {
                                  setState(() => selectedEndDate = picked);
                                }
                              },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            borderRadius: BorderRadius.circular(8),
                            color: isIndefinite ? Colors.grey[100] : Colors.white,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                selectedEndDate == null
                                    ? 'Select end date'
                                    : 'End: ${selectedEndDate!.toString().split(' ')[0]}',
                                style: TextStyle(
                                  color: isIndefinite
                                      ? Colors.grey
                                      : (selectedEndDate == null ? Colors.grey : Colors.black),
                                ),
                              ),
                              Icon(Icons.calendar_today,
                                  size: 18,
                                  color: isIndefinite ? Colors.grey[400] : const Color(0xFF3B82F6)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // OR Divider
                Row(
                  children: [
                    Expanded(child: Container(height: 1, color: Colors.grey[300])),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('OR', style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.w500)),
                    ),
                    Expanded(child: Container(height: 1, color: Colors.grey[300])),
                  ],
                ),
                const SizedBox(height: 16),

                // Set Indefinitely button
                GestureDetector(
                  onTap: selectedStartDate != null
                      ? () {
                          setState(() {
                            isIndefinite = !isIndefinite;
                            if (isIndefinite) {
                              selectedStartDate = null;
                              selectedEndDate = null;
                            }
                          });
                        }
                      : () {
                          setState(() => isIndefinite = !isIndefinite);
                        },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: selectedStartDate != null ? Colors.grey[300]! : const Color(0xFF3B82F6),
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(8),
                      color: selectedStartDate != null ? Colors.grey[50] : const Color(0xFF3B82F6).withOpacity(0.05),
                    ),
                    child: Center(
                      child: Text(
                        'Set Indefinitely',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: selectedStartDate != null ? Colors.grey[400] : const Color(0xFF3B82F6),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: (selectedStartDate != null && selectedEndDate != null) || isIndefinite
                  ? () {
                      Navigator.pop(dialogContext);
                      _submitSetUnavailable(
                        placeId,
                        selectedStartDate,
                        selectedEndDate,
                        isIndefinite,
                      );
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                disabledBackgroundColor: Colors.grey[300],
              ),
              child: const Text('Confirm', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitSetUnavailable(
    int placeId,
    DateTime? startDate,
    DateTime? endDate,
    bool isIndefinite,
  ) async {
    try {
      // Validate that we have the required data
      if (!isIndefinite && startDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please select a start date or set indefinitely'),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
        return;
      }

      // Show loading indicator
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Setting unavailable...')),
      );

      final response = await PlaceService.setPlaceUnavailable(
        placeId,
        startDate: startDate ?? DateTime.now(),
        endDate: endDate,
        isIndefinite: isIndefinite,
      );

      if (!mounted) return;

      final refundedCount = response['refundedBookings'] ?? 0;
      final refundAmount = response['totalRefunded'] ?? 0;

      String message = 'Site set unavailable successfully!';
      if (refundedCount > 0) {
        message += '\n$refundedCount booking(s) cancelled.\nTotal refunded: \$$refundAmount';
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          duration: const Duration(seconds: 4),
          backgroundColor: const Color(0xFF10B981),
        ),
      );

      // Refresh the places list
      _loadPlaces();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
    }
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 48),
          Icon(
            Icons.home_work_outlined,
            size: 80,
            color: Colors.grey[300],
          ),
          const SizedBox(height: 24),
          Text(
            'No Sites Listed Yet',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'Start earning by adding your first site to Proper Place',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const HostCreateSiteScreen(),
                ),
              );
            },
            icon: const Icon(Icons.add, size: 20),
            label: const Text('Create Your First Site'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 48),
        ],
      ),
    );
  }
}
