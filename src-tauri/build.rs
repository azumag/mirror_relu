fn main() {
    println!("cargo:rerun-if-changed=capabilities");

    #[cfg(feature = "e2e")]
    let pattern = "./capabilities/**/*";

    #[cfg(not(feature = "e2e"))]
    let pattern = "./capabilities/default.json";

    let attrs = tauri_build::Attributes::new().capabilities_path_pattern(pattern);

    tauri_build::try_build(attrs).expect("failed to run Tauri build script");
}
