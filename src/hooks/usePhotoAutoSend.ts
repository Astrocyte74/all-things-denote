import { useCallback, useEffect, useState } from 'react';
import { eventHuntId, type EventHunt } from '@/lib/eventHunt';
import { configurePhotoSync, PHOTO_SYNC_CHANGED, readPhotoSync, retryPhotoSync, pendingPhotoChoice } from '@/lib/photoSyncStore';
import { uploadingPhoto } from '@/lib/photoSync';

export function usePhotoAutoSend(hunt: EventHunt) {
  const huntId=eventHuntId(hunt.event.id,hunt.team.id);
  const [state,setState]=useState({ready:false,enabled:false,pending:0,uploading:false,offline:!navigator.onLine,error:null as string|null});
  // Reading the queue successfully does not mean a failed setting was saved.
  // Keep that failure until configuration actually succeeds (including Retry).
  const [settingsError,setSettingsError]=useState<string|null>(null);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let stopped=false;
    const load=async()=>{
      try {
        const {settings,jobs}=await readPhotoSync(huntId);
        if(!stopped)setState({ready:true,enabled:Boolean(settings[0]?.enabled) && pendingPhotoChoice(huntId)!==false,pending:jobs.length,uploading:uploadingPhoto(huntId),offline:!navigator.onLine,error:jobs.find(job=>job.error)?.error??null});
      }catch{if(!stopped)setState(s=>({...s,ready:false,error:'Photo sharing settings could not be read. Your hunt still works; retry here.'}));}
    };
    void configurePhotoSync(hunt).then(()=>{if(!stopped){setSettingsError(null);return load();}}).catch(()=>{if(!stopped){setSettingsError('Photo sharing settings could not be saved. Retry to save your choice.');setState(s=>({...s,ready:false}));}});
    const storage=(e:StorageEvent)=>{if(e.key==='photoSyncChanged')void load();};
    window.addEventListener(PHOTO_SYNC_CHANGED,load);window.addEventListener('storage',storage);window.addEventListener('online',load);window.addEventListener('offline',load);
    return()=>{stopped=true;window.removeEventListener(PHOTO_SYNC_CHANGED,load);window.removeEventListener('storage',storage);window.removeEventListener('online',load);window.removeEventListener('offline',load);};
  },[hunt,huntId,attempt]);
  const setEnabled=useCallback(async(enabled:boolean)=>{
    try{await configurePhotoSync(hunt,enabled);setSettingsError(null);}catch{setSettingsError('Couldn’t save this choice. New automatic uploads are paused on this page; retry to save it.');}
  },[hunt]);
  const retry=useCallback(async()=>{try{await retryPhotoSync(huntId);setAttempt(n=>n+1);}catch{setSettingsError('Couldn’t read the photo queue. Please reopen the app and retry.');}},[huntId]);
  return {...state,error:settingsError??state.error,setEnabled,retry};
}

export type PhotoAutoSendState = ReturnType<typeof usePhotoAutoSend>;
