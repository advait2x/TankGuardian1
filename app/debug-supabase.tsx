import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/store/AuthContext';
import { supabase } from '@/utils/supabase';

interface TankRow {
  id: string;
  owner_id: string;
  name: string;
  size_gallons: number;
  tank_type?: string;
  water_type?: string;
  created_at?: string;
}

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export default function DebugSupabaseScreen() {
  const { session, user } = useAuth();
  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [loadError, setLoadError] = useState<SupabaseError | null>(null);
  const [insertResult, setInsertResult] = useState<string>('');
  const [insertError, setInsertError] = useState<SupabaseError | null>(null);
  const [loading, setLoading] = useState(false);

  const hasAccessToken = !!session?.access_token;

  const handleReloadTanks = async () => {
    setLoading(true);
    setLoadError(null);
    setTanks([]);
    
    try {
      console.log('[Debug] Fetching tanks...');
      const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('[Debug] Load error:', error);
        setLoadError({
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      } else {
        console.log('[Debug] Loaded tanks:', data?.length || 0);
        setTanks(data || []);
      }
    } catch (err) {
      console.error('[Debug] Exception:', err);
      setLoadError({
        message: String(err),
        code: 'EXCEPTION',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestInsert = async () => {
    setLoading(true);
    setInsertResult('');
    setInsertError(null);

    if (!user?.id) {
      setInsertError({
        message: 'No authenticated user',
        code: 'NO_USER',
      });
      setLoading(false);
      return;
    }

    try {
      console.log('[Debug] Inserting test tank for user:', user.id);
      const testTank = {
        owner_id: user.id,
        name: `Debug Tank ${new Date().toISOString()}`,
        tank_type: 'rectangle',
        size_gallons: 20,
        water_type: 'freshwater',
      };

      const { data, error } = await supabase
        .from('tanks')
        .insert(testTank)
        .select('*')
        .single();

      if (error) {
        console.error('[Debug] Insert error:', error);
        setInsertError({
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      } else {
        console.log('[Debug] Insert success:', data);
        setInsertResult(`✅ Created tank: ${data.id}`);
        // Auto-reload tanks after successful insert
        setTimeout(() => handleReloadTanks(), 500);
      }
    } catch (err) {
      console.error('[Debug] Exception:', err);
      setInsertError({
        message: String(err),
        code: 'EXCEPTION',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Supabase Debug</Text>

      {/* Auth Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{user?.id || 'not logged in'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Access Token:</Text>
          <Text style={styles.value}>{hasAccessToken ? 'true ✅' : 'false ❌'}</Text>
        </View>
      </View>

      {/* Load Tanks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Load Tanks</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReloadTanks}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Loading...' : '🔄 Reload Tanks'}
          </Text>
        </TouchableOpacity>

        {loadError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>❌ Load Error</Text>
            <Text style={styles.errorText}>Message: {loadError.message}</Text>
            {loadError.code && <Text style={styles.errorText}>Code: {loadError.code}</Text>}
            {loadError.details && <Text style={styles.errorText}>Details: {loadError.details}</Text>}
            {loadError.hint && <Text style={styles.errorText}>Hint: {loadError.hint}</Text>}
          </View>
        )}

        {tanks.length > 0 && (
          <View style={styles.resultsBox}>
            <Text style={styles.resultsTitle}>✅ Loaded {tanks.length} tank(s)</Text>
            {tanks.map((tank, index) => (
              <View key={tank.id} style={styles.tankCard}>
                <Text style={styles.tankIndex}>Tank #{index + 1}</Text>
                <Text style={styles.tankDetail}>ID: {tank.id}</Text>
                <Text style={styles.tankDetail}>Owner: {tank.owner_id}</Text>
                <Text style={styles.tankDetail}>Name: {tank.name}</Text>
                <Text style={styles.tankDetail}>Size: {tank.size_gallons} gallons</Text>
                {tank.tank_type && <Text style={styles.tankDetail}>Type: {tank.tank_type}</Text>}
                {tank.water_type && <Text style={styles.tankDetail}>Water: {tank.water_type}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Test Insert */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Insert</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonInsert, (loading || !user) && styles.buttonDisabled]}
          onPress={handleTestInsert}
          disabled={loading || !user}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Inserting...' : '➕ Test Insert Tank'}
          </Text>
        </TouchableOpacity>

        {!user && (
          <Text style={styles.warningText}>⚠️ Must be logged in to insert</Text>
        )}

        {insertResult && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{insertResult}</Text>
          </View>
        )}

        {insertError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>❌ Insert Error</Text>
            <Text style={styles.errorText}>Message: {insertError.message}</Text>
            {insertError.code && <Text style={styles.errorText}>Code: {insertError.code}</Text>}
            {insertError.details && <Text style={styles.errorText}>Details: {insertError.details}</Text>}
            {insertError.hint && <Text style={styles.errorText}>Hint: {insertError.hint}</Text>}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Debug screen for Supabase connectivity testing</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    marginTop: 40,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#999',
    width: 120,
  },
  value: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonInsert: {
    backgroundColor: '#10b981',
  },
  buttonDisabled: {
    backgroundColor: '#444',
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#3f1515',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#fca5a5',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  successBox: {
    backgroundColor: '#14532d',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  successText: {
    fontSize: 14,
    color: '#4ade80',
    fontWeight: '600',
  },
  resultsBox: {
    marginTop: 12,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 12,
  },
  tankCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tankIndex: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '600',
  },
  tankDetail: {
    fontSize: 13,
    color: '#e2e8f0',
    marginBottom: 3,
    fontFamily: 'monospace',
  },
  warningText: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
