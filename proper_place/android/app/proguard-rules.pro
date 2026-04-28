# Flutter
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Stripe - keep all core classes
-keep class com.stripe.android.** { *; }
-keep class com.stripe.android.model.** { *; }
-keep class com.stripe.android.core.** { *; }
-keep class com.stripe.android.payments.** { *; }
-keep class com.stripe.android.paymentsheet.** { *; }
-keep class com.stripe.android.ui.core.** { *; }
-keepclassmembers class com.stripe.android.** { *; }

# Stripe push provisioning (not used but referenced by SDK)
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivity$g
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Args
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Error
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningEphemeralKeyProvider

# Google Play Core (referenced by Flutter deferred components)
-dontwarn com.google.android.play.core.splitcompat.**
-dontwarn com.google.android.play.core.splitinstall.**
-dontwarn com.google.android.play.core.tasks.**
