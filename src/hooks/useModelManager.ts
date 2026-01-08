import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import GenAI from '../plugins/GenAI';

// 👇 GEMMA 2 (2B) - The "Gold Standard" for Android
// It is Int4 (Compressed), so it is only ~1.3 GB. 
// It fits in RAM and won't crash your phone.
const MODEL_FILENAME = "gemma-2b-it-cpu-int4.bin";

// 👇 Official Google Link (Verified & Working)
const MODEL_URL = "https://storage.googleapis.com/kagglesdsdata/models/11850/14305/gemma-2b-it-cpu-int4.bin?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20260105%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260105T204538Z&X-Goog-Expires=259200&X-Goog-SignedHeaders=host&X-Goog-Signature=acef6d2196074ec23a7dfb89404025b5dac80afd89cb17dad08328727f604eb6e7f088dbf9513426be6bafc48f633a71b9d84bb982a8032467e1f476f0436d628ee1a3b1c28edbde360c9d6ff2d0e90b3e661d07f2e55ddaf165776e98c74c80b8ab24004ea65a8e248257fed95bd625980d8759e683ee853b8dca96670913fe91687f2efba7cd5c519795d6109ce34d061caaf381cbcd97f9b5e3986729caec5ea7fa9f19108ab85674afa8ee2d7fc139702575ad5dfcf899a4f5ec1edef78606544f93599d05f789337367847b0df8b7414ea1c4e7a9d7106448befde402be5e747cc6b44ee1951684b8ac69374220a08232117807508558c03cefe8c011fe";
export const useModelManager = () => {
  const [isReady, setIsReady] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initializing...");

  useEffect(() => {
    checkDependencies();
    const listener = GenAI.addListener('downloadProgress', (data) => {
      setDownloadProgress(prev => (data.progress < prev && prev > 5 && data.progress > 0) ? prev : data.progress);
    });
    return () => { listener.remove(); };
  }, []);

  const checkDependencies = async () => {
    try {
      // Check for our specific NEW filename
      const specific = await GenAI.isModelReady({ filename: MODEL_FILENAME });
      
      // Check if ANY bad files exist (so we can delete them)
      const wildcard = await GenAI.isModelReady({});

      setIsReady(specific.exists);
      setFileExists(wildcard.exists);

      if (specific.exists) {
        setStatusMessage("AI Ready (Gemma 2)");
      } else if (wildcard.exists) {
        setStatusMessage("Corrupted/Old Model Detected");
      } else {
        setStatusMessage("Model Missing");
      }
    } catch (e) {
      console.error(e);
      setStatusMessage("Error checking AI");
    }
  };

  const downloadModel = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setStatusMessage("Downloading Fresh Model...");

    try {
      // Force delete EVERYTHING before starting
      await GenAI.deleteModel(); 
      
      const res = await GenAI.downloadModel({ url: MODEL_URL, filename: MODEL_FILENAME });
      if (res.success) {
        await Preferences.set({ key: 'model_installed_v2', value: 'true' });
        checkDependencies();
      }
    } catch (e) {
      setStatusMessage("Download Error: " + (e as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteModel = async () => {
    try {
        await GenAI.deleteModel(); 
        await Preferences.remove({ key: 'model_installed_v2' });
        setIsReady(false);
        setFileExists(false);
        setStatusMessage("Model deleted");
    } catch (e) {
        alert("Error deleting: " + (e as Error).message);
    }
  };

  return { isReady, fileExists, isDownloading, downloadProgress, statusMessage, downloadModel, deleteModel };
};