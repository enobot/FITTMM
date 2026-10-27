plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services") apply false
}

if (file("google-services.json").exists()) {
    pluginManager.apply("com.google.gms.google-services")
}

// The FITTMM API. Debug builds default to the computer running the emulator;
// override with -PfittmmApiUrl=https://api.example.com (or in gradle.properties).
val debugApiUrl = (findProperty("fittmmDebugApiUrl") as String?) ?: "http://10.0.2.2:8000"
val releaseApiUrl = (findProperty("fittmmApiUrl") as String?) ?: "https://api.example.com"

android {
    namespace = "com.fittmm.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.fittmm.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.1"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"$debugApiUrl\"")
        }
        release {
            isMinifyEnabled = false
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiUrl\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    lint {
        abortOnError = false
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-auth")
    // One-tap Google sign-in
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    // Exercise photos and video thumbnails
    implementation("io.coil-kt:coil:2.7.0")

    testImplementation("junit:junit:4.13.2")
    // Android's org.json is a stub on the JVM; use the real one in unit tests
    testImplementation("org.json:json:20240303")
}
