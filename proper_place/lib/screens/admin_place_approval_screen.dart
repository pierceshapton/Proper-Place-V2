import 'package:flutter/material.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/models/place.dart';

class AdminPlaceApprovalScreen extends StatefulWidget {
  const AdminPlaceApprovalScreen({Key? key}) : super(key: key);

  @override
  State<AdminPlaceApprovalScreen> createState() =>
      _AdminPlaceApprovalScreenState();
}

class _AdminPlaceApprovalScreenState extends State<AdminPlaceApprovalScreen> {
  List<Place> pendingPlaces = [];
  bool isLoading = true;
  Map<String, dynamic> selectedPlace = {};

  @override
  void initState() {
    super.initState();
    _loadPendingPlaces();
  }

  Future<void> _loadPendingPlaces() async {
    setState(() => isLoading = true);
    try {
      final placesData = await ApiService.getPendingPlaces();
      final places = (placesData as List)
          .map((p) => Place.fromJson(p as Map<String, dynamic>))
          .toList();

      setState(() {
        pendingPlaces = places;
        isLoading = false;
      });
    } catch (e) {
    debugPrint('Error loading pending places: $e');
      setState(() => isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading places: $e')),
        );
      }
    }
  }

  Future<void> _approvePlace(String placeId) async {
    try {
      await ApiService.approvePlace(placeId: placeId);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Place approved!')),
      );
      _loadPendingPlaces();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error approving place: $e')),
      );
    }
  }

  void _showRejectDialog(String placeId) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Place'),
        content: TextField(
          controller: reasonController,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Reason for rejection...',
            hintStyle: TextStyle(color: Color(0xFF57575D)),
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (reasonController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a reason'),
                  ),
                );
                return;
              }
              try {
                await ApiService.rejectPlace(
                  placeId: placeId,
                  reason: reasonController.text,
                );
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Place rejected!')),
                );
                _loadPendingPlaces();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error rejecting place: $e')),
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

  void _showPlaceDetails(Place place) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: ListView(
          shrinkWrap: true,
          children: [
            const Text(
              'Place Review',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            if (place.imageUrl != null && place.imageUrl!.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  place.imageUrl!,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 200,
                      color: Colors.grey[300],
                      child: const Icon(Icons.image_not_supported),
                    );
                  },
                ),
              ),
            const SizedBox(height: 16),
            _buildInfoRow('Name', place.name),
            _buildInfoRow('Type', place.placeType ?? 'N/A'),
            _buildInfoRow('Address', place.address),
            _buildInfoRow('Price', '£${place.pricePerNight}/night'),
            _buildInfoRow('Host', place.hostName ?? 'Unknown'),
            _buildInfoRow('Host Email', place.hostEmail ?? 'N/A'),
            _buildInfoRow('Contract Signed', place.hostContractAcceptedAt != null ? 'Yes' : 'NO - Not Signed'),
            const SizedBox(height: 8),
            const Text(
              'Description',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(place.description),
            if (place.amenities != null) ...[
              const SizedBox(height: 12),
              const Text(
                'Amenities',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(place.amenities!),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _showRejectDialog(place.placeId);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                    ),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _approvePlace(place.placeId);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                    child: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pending Place Approvals'),
        elevation: 0,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : pendingPlaces.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.check_circle,
                        size: 64,
                        color: Colors.green[400],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No Pending Approvals',
                        style: TextStyle(fontSize: 18),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'All places have been reviewed',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: pendingPlaces.length,
                  itemBuilder: (context, index) {
                    final place = pendingPlaces[index];
                    return GestureDetector(
                      onTap: () => _showPlaceDetails(place),
                      child: Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (place.imageUrl != null &&
                                place.imageUrl!.isNotEmpty)
                              ClipRRect(
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(12),
                                ),
                                child: Image.network(
                                  place.imageUrl!,
                                  height: 150,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      height: 150,
                                      color: Colors.grey[300],
                                      child: const Icon(
                                        Icons.image_not_supported,
                                      ),
                                    );
                                  },
                                ),
                              ),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    place.name,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    place.address,
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Host: ${place.hostName}',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 12,
                                    ),
                                  ),
                                  if (place.hostContractAcceptedAt == null)
                                    Container(
                                      margin: const EdgeInsets.only(top: 4),
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.red[50],
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: Colors.red[300]!),
                                      ),
                                      child: Text(
                                        'Contract NOT Signed',
                                        style: TextStyle(color: Colors.red[700], fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: () =>
                                              _showRejectDialog(place.placeId),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.red,
                                          ),
                                          child: const Text('Reject'),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: () =>
                                              _approvePlace(place.placeId),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.green,
                                          ),
                                          child: const Text('Approve'),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _loadPendingPlaces,
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
