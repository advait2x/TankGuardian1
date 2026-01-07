import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, useWindowDimensions } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Polyline } from 'react-native-svg';
import { listWaterLogs, RemoteWaterLog } from '@/utils/remoteWaterLogs';

const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 10, bottom: 30, left: 35 }; // Reduced left padding

type Metric = 'ph' | 'temperature' | 'ammonia_ppm' | 'nitrite_ppm' | 'nitrate_ppm';
type Range = '7d' | '30d' | '90d' | 'all';

interface WaterTrendsChartProps {
  tankId: string;
}

interface CacheEntry {
  data: RemoteWaterLog[];
  timestamp: number;
}

// In-memory cache per tank+range (5 min TTL)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const metricLabels: Record<Metric, string> = {
  ph: 'pH',
  temperature: 'Temp (°F)',
  ammonia_ppm: 'Ammonia (ppm)',
  nitrite_ppm: 'Nitrite (ppm)',
  nitrate_ppm: 'Nitrate (ppm)',
};

const metricColors: Record<Metric, string> = {
  ph: '#3B82F6',
  temperature: '#EF4444',
  ammonia_ppm: '#F59E0B',
  nitrite_ppm: '#8B5CF6',
  nitrate_ppm: '#10B981',
};

export default function WaterTrendsChart({ tankId }: WaterTrendsChartProps) {
  const [metric, setMetric] = useState<Metric>('ph');
  const [range, setRange] = useState<Range>('30d');
  const [logs, setLogs] = useState<RemoteWaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);

  // Use window dimensions for responsive sizing
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = containerWidth > 0 ? containerWidth : windowWidth - 48;

  // Calculate fromDate based on range
  const fromDate = useMemo(() => {
    if (range === 'all') return undefined;
    
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return from.toISOString();
  }, [range]);

  // Fetch data with caching
  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const cacheKey = `${tankId}_${range}`;
      const cached = cache.get(cacheKey);

      // Check cache
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setLogs(cached.data);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await listWaterLogs({
          tankId,
          fromDate,
          limit: range === 'all' ? 500 : 200,
        });

        if (mounted) {
          setLogs(data);
          cache.set(cacheKey, { data, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('[WaterTrends] Error fetching logs:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [tankId, range, fromDate]);

  // Extract data points for selected metric
  const dataPoints = useMemo(() => {
    return logs
      .map((log) => ({
        date: new Date(log.created_at),
        value: log[metric],
      }))
      .filter((point) => point.value !== null && point.value !== undefined);
  }, [logs, metric]);

  // Calculate scales
  const { xScale, yScale, yTicks } = useMemo(() => {
    if (dataPoints.length === 0 || chartWidth === 0) {
      return { xScale: () => 0, yScale: () => 0, yTicks: [] };
    }

    const values = dataPoints.map((p) => p.value as number);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Add 10% padding to y-axis
    const padding = (maxValue - minValue) * 0.1 || 1;
    const yMin = Math.max(0, minValue - padding);
    const yMax = maxValue + padding;

    const chartContentWidth = chartWidth - PADDING.left - PADDING.right;
    const chartContentHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const xMin = dataPoints[0].date.getTime();
    const xMax = dataPoints[dataPoints.length - 1].date.getTime();

    const xScale = (date: Date) => {
      if (xMax === xMin) return PADDING.left;
      return PADDING.left + ((date.getTime() - xMin) / (xMax - xMin)) * chartContentWidth;
    };

    const yScale = (value: number) => {
      if (yMax === yMin) return PADDING.top + chartContentHeight / 2;
      return PADDING.top + chartContentHeight - ((value - yMin) / (yMax - yMin)) * chartContentHeight;
    };

    // Generate 5 y-axis ticks
    const ticks = Array.from({ length: 5 }, (_, i) => {
      const value = yMin + ((yMax - yMin) * i) / 4;
      return { value, y: yScale(value) };
    });

    return { xScale, yScale, yTicks: ticks };
  }, [dataPoints, chartWidth]);

  // Generate polyline points
  const linePoints = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((p) => `${xScale(p.date)},${yScale(p.value as number)}`)
      .join(' ');
  }, [dataPoints, xScale, yScale]);

  // Format date for x-axis labels
  const formatDate = (date: Date) => {
    if (range === '7d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View 
      style={styles.container}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width - 32); // Subtract internal padding
      }}
    >
      {/* Metric Selector */}
      <View style={styles.selectorRow}>
        <Text style={styles.label}>Metric:</Text>
        <View style={styles.segmentedControl}>
          {(Object.keys(metricLabels) as Metric[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.segment, metric === m && styles.segmentActive]}
              onPress={() => setMetric(m)}
            >
              <Text style={[styles.segmentText, metric === m && styles.segmentTextActive]}>
                {metricLabels[m].split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Range Selector */}
      <View style={styles.selectorRow}>
        <Text style={styles.label}>Range:</Text>
        <View style={styles.segmentedControl}>
          {(['7d', '30d', '90d', 'all'] as Range[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.segment, range === r && styles.segmentActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.segmentText, range === r && styles.segmentTextActive]}>
                {r === 'all' ? 'All' : r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={metricColors[metric]} />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : dataPoints.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No data available for this period</Text>
            <Text style={styles.emptySubtext}>Log water parameters to see trends</Text>
          </View>
        ) : dataPoints.length === 1 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Not enough data yet</Text>
            <Text style={styles.emptySubtext}>Add more logs to see trend lines</Text>
          </View>
        ) : chartWidth > 0 ? (
          <View style={{ overflow: 'hidden' }}>
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              {/* Y-axis ticks */}
              {yTicks.map((tick, i) => (
                <React.Fragment key={i}>
                  <Line
                    x1={PADDING.left}
                    y1={tick.y}
                    x2={chartWidth - PADDING.right}
                    y2={tick.y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <SvgText
                    x={PADDING.left - 5}
                    y={tick.y + 3}
                    fontSize="9"
                    fill="#6B7280"
                    textAnchor="end"
                  >
                    {tick.value.toFixed(1)}
                  </SvgText>
                </React.Fragment>
              ))}

              {/* Data line */}
              <Polyline
                points={linePoints}
                fill="none"
                stroke={metricColors[metric]}
                strokeWidth="2"
              />

              {/* Data points */}
              {dataPoints.map((point, i) => (
                <Circle
                  key={i}
                  cx={xScale(point.date)}
                  cy={yScale(point.value as number)}
                  r="4"
                  fill={metricColors[metric]}
                />
              ))}

              {/* X-axis labels (first, middle, last) */}
              {dataPoints.length > 0 && (
                <>
                  <SvgText
                    x={xScale(dataPoints[0].date)}
                    y={CHART_HEIGHT - 5}
                    fontSize="9"
                    fill="#6B7280"
                    textAnchor="start"
                  >
                    {formatDate(dataPoints[0].date)}
                  </SvgText>
                  {dataPoints.length > 2 && (
                    <SvgText
                      x={xScale(dataPoints[Math.floor(dataPoints.length / 2)].date)}
                      y={CHART_HEIGHT - 5}
                      fontSize="9"
                      fill="#6B7280"
                      textAnchor="middle"
                    >
                      {formatDate(dataPoints[Math.floor(dataPoints.length / 2)].date)}
                    </SvgText>
                  )}
                  <SvgText
                    x={xScale(dataPoints[dataPoints.length - 1].date)}
                    y={CHART_HEIGHT - 5}
                    fontSize="9"
                    fill="#6B7280"
                    textAnchor="end"
                  >
                    {formatDate(dataPoints[dataPoints.length - 1].date)}
                  </SvgText>
                </>
              )}
            </Svg>
          </View>
        ) : null}
      </View>

      {/* Legend */}
      {!loading && dataPoints.length > 1 && (
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: metricColors[metric] }]} />
          <Text style={styles.legendText}>
            {metricLabels[metric]} • {dataPoints.length} data points
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
    width: 60,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
