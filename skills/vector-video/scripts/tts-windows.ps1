param([Parameter(Mandatory = $true)][string]$JobsFile)
# Turns text into WAV files with the speech voices built into Windows.
# Input: a JSON list of { text, out, voice, rate }. Output: one 22050 Hz mono 16-bit WAV per job.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -Raw -Encoding UTF8 $JobsFile | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($job in $jobs) {
  if ($job.voice) {
    try { $synth.SelectVoice([string]$job.voice) } catch { Write-Warning "Voice not found: $($job.voice). Using the default voice." }
  }
  $synth.Rate = [int]$job.rate
  $synth.SetOutputToWaveFile([string]$job.out, $format)
  $synth.Speak([string]$job.text)
  $synth.SetOutputToNull()
}
$synth.Dispose()
