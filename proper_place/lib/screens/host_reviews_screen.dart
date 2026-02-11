import 'package:flutter/material.dart';
import '../services/storage_service.dart';

class HostReviewsScreen extends StatefulWidget {
  const HostReviewsScreen({super.key});

  @override
  State<HostReviewsScreen> createState() => _HostReviewsScreenState();
}

class _HostReviewsScreenState extends State<HostReviewsScreen> {
  List<dynamic> reviews = [];
  bool isLoading = true;
  String? errorMessage;
  String filterRating = 'all'; // 'all', '5', '4', '3', '2', '1'

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        setState(() {
          errorMessage = 'Authentication token not found';
          isLoading = false;
        });
        return;
      }

      // Mock data - replace with real API call to /places/:id/reviews
      setState(() {
        reviews = [
          {
            'id': 1,
            'guestName': 'Sarah Johnson',
            'guestAvatar': 'https://i.pravatar.cc/150?img=1',
            'rating': 5,
            'placeTitle': 'Cozy Van Escape',
            'date': '2024-01-15',
            'text':
                'Amazing experience! The van was clean and comfortable. Perfect for our weekend getaway in Sedona. Highly recommend!',
          },
          {
            'id': 2,
            'guestName': 'Mike Chen',
            'guestAvatar': 'https://i.pravatar.cc/150?img=2',
            'rating': 4,
            'placeTitle': 'Mountain Retreat Van',
            'date': '2024-01-10',
            'text':
                'Good location and nice setup. Only thing is the heater was a bit loud, but overall great stay.',
          },
          {
            'id': 3,
            'guestName': 'Emma Wilson',
            'guestAvatar': 'https://i.pravatar.cc/150?img=3',
            'rating': 5,
            'placeTitle': 'Beachside Mobile Home',
            'date': '2024-01-08',
            'text':
                'Gorgeous views! Woke up to the ocean every morning. Hosts were super responsive and helpful. Will definitely come back!',
          },
          {
            'id': 4,
            'guestName': 'James Rodriguez',
            'guestAvatar': 'https://i.pravatar.cc/150?img=4',
            'rating': 4,
            'placeTitle': 'Cozy Van Escape',
            'date': '2024-01-05',
            'text':
                'Really nice spot. Parking was convenient. Would appreciate more kitchen utensils, but had everything we needed.',
          },
          {
            'id': 5,
            'guestName': 'Lisa Anderson',
            'guestAvatar': 'https://i.pravatar.cc/150?img=5',
            'rating': 5,
            'placeTitle': 'Mountain Retreat Van',
            'date': '2024-01-01',
            'text': 'Perfect for families! Kids loved the space. Great communication from the host. 10/10 would rent again.',
          },
          {
            'id': 6,
            'guestName': 'Tom Bradley',
            'guestAvatar': 'https://i.pravatar.cc/150?img=6',
            'rating': 3,
            'placeTitle': 'Beachside Mobile Home',
            'date': '2023-12-28',
            'text':
                'Decent place but a bit dated. Furnishing could use an update. Beach access is great though.',
          },
        ];
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        errorMessage = 'Error loading reviews: $e';
        isLoading = false;
      });
    }
  }

  List<dynamic> _getFilteredReviews() {
    if (filterRating == 'all') {
      return reviews;
    }
    final ratingFilter = int.parse(filterRating);
    return reviews.where((r) => r['rating'] == ratingFilter).toList();
  }

  double _getAverageRating() {
    if (reviews.isEmpty) return 0;
    final sum = reviews.fold<int>(0, (acc, r) => acc + (r['rating'] as int));
    return sum / reviews.length;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _getFilteredReviews();
    final avgRating = _getAverageRating();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guest Reviews'),
        elevation: 0,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF7BA7D8), Color(0xFF6B96C8)],
            ),
          ),
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(errorMessage!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadReviews,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : reviews.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.rate_review_outlined,
                              size: 48, color: Colors.grey),
                          SizedBox(height: 16),
                          Text(
                            'No reviews yet',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.w600),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Guest reviews will appear here after bookings',
                            style: TextStyle(color: Colors.grey),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadReviews,
                      child: SingleChildScrollView(
                        child: Column(
                          children: [
                            // Summary Card
                            _buildSummaryCard(avgRating),
                            // Filter Pills
                            _buildFilterPills(filtered.length),
                            // Reviews List
                            ListView.builder(
                              padding: const EdgeInsets.symmetric(
                                  vertical: 12, horizontal: 16),
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                return _buildReviewCard(filtered[index]);
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
    );
  }

  Widget _buildSummaryCard(double avgRating) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF7BA7D8), Color(0xFF6B96C8)],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          const Text(
            'Average Rating',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                avgRating.toStringAsFixed(1),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: List.generate(
                      5,
                      (i) => Icon(
                        i < avgRating.floor() ? Icons.star : Icons.star_outline,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${reviews.length} reviews',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPills(int filteredCount) {
    final ratings = ['all', '5', '4', '3', '2', '1'];
    final labels = ['All', '5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: List.generate(
          ratings.length,
          (i) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(labels[i]),
              selected: filterRating == ratings[i],
              backgroundColor: filterRating == ratings[i] ? const Color(0xFF7BA7D8) : Colors.grey[100],
              onSelected: (selected) {
                setState(() {
                  filterRating = ratings[i];
                });
              },
              labelStyle: TextStyle(
                color:
                    filterRating == ratings[i] ? Colors.white : Colors.black,
              ),
              side: BorderSide(
                color: filterRating == ratings[i] ? Colors.transparent : const Color(0xFFE2E8F0),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReviewCard(dynamic review) {
    final stars = List.generate(
      5,
      (i) => Icon(
        i < (review['rating'] as int) ? Icons.star : Icons.star_outline,
        size: 14,
        color: Colors.amber,
      ),
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Guest avatar, name, rating
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundImage:
                      NetworkImage(review['guestAvatar'] as String),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        review['guestName'] as String,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: stars,
                      ),
                    ],
                  ),
                ),
                Text(
                  review['date'] as String,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Place title tag
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                review['placeTitle'] as String,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Review text
            Text(
              review['text'] as String,
              style: const TextStyle(
                fontSize: 13,
                height: 1.5,
              ),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
