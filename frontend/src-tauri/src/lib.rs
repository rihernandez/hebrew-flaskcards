#[tauri::command]
fn open_pdf(app: tauri::AppHandle, pdf: String) -> Result<(), String> {
    let label = format!("pdf_{}", pdf.replace('.', "_").replace('/', "_"));
    let url = format!("docs/{}", pdf);

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
             $preferred = @('es-ES','es-MX','es-US'); \
             $selected = $false; \
             foreach ($culture in $preferred) {{ \
               $voice = $s.GetInstalledVoices() | Where-Object {{ $_.Enabled -and $_.VoiceInfo.Culture.Name -eq $culture }} | Select-Object -First 1; \
               if ($voice) {{ $s.SelectVoice($voice.VoiceInfo.Name); $selected = $true; break; }} \
             }} \
             if (-not $selected) {{ \
               $anySpanish = $s.GetInstalledVoices() | Where-Object {{ $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'es-*' }} | Select-Object -First 1; \
               if ($anySpanish) {{ $s.SelectVoice($anySpanish.VoiceInfo.Name); $selected = $true; }} \
             }} \
             if (-not $selected) {{ Write-Error 'NO_SPANISH_VOICE'; exit 2; }} \
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
