export const setupAudioAnalysis = (audioRef: React.RefObject<HTMLAudioElement>, updateBlendshapes: (data: any[]) => void) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 32;
  
    if (audioRef.current) {
      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
    }
  
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);
      const intensity = dataArray[1] / 255; // Use low frequency for mouth movement
      updateBlendshapes([{ categoryName: "JawOpen", score: intensity }]);
      requestAnimationFrame(analyze);
    };
    analyze();
  };
  