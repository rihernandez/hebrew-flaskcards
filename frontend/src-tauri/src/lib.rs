use tauri::Manager;

#[tauri::command]
fn open_pdf(app: tauri::AppHandle, pdf: String) -> Result<(), String> {
    let pdf = pdf.replace('\\', "/");
    let allowed = [
        "estructura-oraciones-espanol.pdf",
        "combinaciones-especiales-espanol.pdf",
        "conjugaciones-verbales-espanol.pdf",
        "verbos-irregulares-espanol.pdf",
    ];
    if !allowed.contains(&pdf.as_str()) {
        return Err("Invalid PDF file".into());
    }

    #[cfg(target_os = "windows")]
    {
        let resource_path = app
            .path()
            .resolve(
                format!("docs/{}", pdf),
                tauri::path::BaseDirectory::Resource,
            )
            .map_err(|e| e.to_string())?;

        let escaped = resource_path.to_string_lossy().replace('\'', "''");
        let status = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!("Start-Process -FilePath '{}'", escaped),
            ])
            .status()
            .map_err(|e| e.to_string())?;

        if status.success() {
            return Ok(());
        }

        return Err("Failed to open PDF with default Windows app.".into());
    }

    let label = format!("pdf_{}", pdf.replace('.', "_").replace('/', "_"));
    let url = format!("/docs/{}", pdf);

    if let Some(existing) = app.get_webview_window(&label) {
        existing.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App(url.into()),
    )
    .title("📖 Guía de Español")
    .inner_size(900.0, 700.0)
    .resizable(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(Some(update.version.clone())),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

#[tauri::command]
fn speak_spanish_tts(text: String) -> Result<(), String> {
    let phrase = text.trim().to_string();
    if phrase.is_empty() {
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let spd = std::process::Command::new("spd-say")
            .args(["-l", "es", &phrase])
            .status();

        if let Ok(status) = spd {
            if status.success() {
                return Ok(());
            }
        }

        let espeak = std::process::Command::new("espeak")
            .args(["-v", "es", &phrase])
            .status();

        if let Ok(status) = espeak {
            if status.success() {
                return Ok(());
            }
        }

        return Err("No Linux TTS backend available (tried spd-say and espeak).".into());
    }

    #[cfg(target_os = "windows")]
    {
        let escaped = phrase.replace('\'', "''");
        let script = format!(
            "Add-Type -AssemblyName System.Speech; \
             $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; \
             $voices = $s.GetInstalledVoices() | Where-Object {{ $_.Enabled }}; \
             $spanishVoices = $voices | Where-Object {{ $_.VoiceInfo.Culture.Name -like 'es-*' }}; \
             if (-not $spanishVoices -or $spanishVoices.Count -eq 0) {{ Write-Error 'NO_SPANISH_VOICE'; exit 2; }} \
             $preferredCultures = @('es-ES','es-MX','es-US'); \
             $best = $spanishVoices | ForEach-Object {{ \
               $v = $_.VoiceInfo; \
               $score = 0; \
               $culture = $v.Culture.Name; \
               $name = $v.Name; \
               $idx = [Array]::IndexOf($preferredCultures, $culture); \
               if ($idx -ge 0) {{ $score += (300 - ($idx * 30)); }} \
               if ($name -match '(?i)(neural|natural|online)') {{ $score += 120; }} \
               if ($name -match '(?i)(premium|pro)') {{ $score += 40; }} \
               if ($name -notmatch '(?i)desktop') {{ $score += 35; }} \
               if ($name -match '(?i)microsoft') {{ $score += 10; }} \
               [PSCustomObject]@{{ Score = $score; Name = $name }}; \
             }} | Sort-Object -Property Score -Descending, Name; \
             if (-not $best -or $best.Count -eq 0) {{ Write-Error 'NO_SPANISH_VOICE'; exit 2; }} \
             $s.SelectVoice($best[0].Name); \
             $s.Speak('{}');",
            escaped
        );

        let status = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .status()
            .map_err(|e| e.to_string())?;

        if status.success() {
            return Ok(());
        }

        return Err("NO_SPANISH_VOICE".into());
    }

    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("say")
            .args(["-v", "Monica", &phrase])
            .status()
            .map_err(|e| e.to_string())?;

        if status.success() {
            return Ok(());
        }

        return Err("macOS TTS command failed.".into());
    }

    #[allow(unreachable_code)]
    Err("TTS is not supported on this platform.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![open_pdf, check_for_updates, install_update, speak_spanish_tts])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
