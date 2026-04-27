/**
 * useAuctionSocket.js
 * React hook for subscribing to real-time auction events on a specific RFQ.
 */
import { useEffect, useState } from 'react';
import socket from '../socket.js';

export function useSocketStatus() {
  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);
  return connected;
}

export function useAuctionSocket(rfqId, { onBidNew, onExtended, onStatusChange, onViewers }) {
  useEffect(() => {
    if (!rfqId) return;

    // Join this auction's room
    socket.emit('join:rfq', rfqId);

    const handleBidNew = (data) => onBidNew && onBidNew(data);
    const handleExtended = (data) => onExtended && onExtended(data);
    const handleStatus = (data) => {
      if (data.rfqId === rfqId || String(data.rfqId) === String(rfqId)) {
        onStatusChange && onStatusChange(data);
      }
    };
    const handleViewers = (data) => {
      if (String(data.rfqId) === String(rfqId)) {
        onViewers && onViewers(data.count);
      }
    };

    socket.on('bid:new', handleBidNew);
    socket.on('auction:extended', handleExtended);
    socket.on('auction:status', handleStatus);
    socket.on('room:viewers', handleViewers);

    return () => {
      socket.emit('leave:rfq', rfqId);
      socket.off('bid:new', handleBidNew);
      socket.off('auction:extended', handleExtended);
      socket.off('auction:status', handleStatus);
      socket.off('room:viewers', handleViewers);
    };
  }, [rfqId]);
}

export function useRFQListSocket({ onL1Update, onStatusUpdate }) {
  useEffect(() => {
    const handleL1 = (data) => onL1Update && onL1Update(data);
    const handleStatus = (data) => onStatusUpdate && onStatusUpdate(data);

    socket.on('rfq:l1_update', handleL1);
    socket.on('rfq:status_update', handleStatus);

    return () => {
      socket.off('rfq:l1_update', handleL1);
      socket.off('rfq:status_update', handleStatus);
    };
  }, []);
}
