import { createClient } from '@supabase/supabase-js';
import { SystemMonitoringService } from './SystemMonitoringService';
import { LocationService } from './LocationService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class MockSupabase {
  storage = {
    from: (bucketName: string) => ({
      upload: async (filePath: string, _file: any, _options?: any) => {
        console.log(`[Mock Supabase Storage] Uploading to ${bucketName}/${filePath}`);
        return { data: { path: filePath }, error: null };
      },
      getPublicUrl: (filePath: string) => {
        console.log(`[Mock Supabase Storage] Getting public URL for ${filePath}`);
        return { data: { publicUrl: `https://picsum.photos/seed/${filePath}/800/600` } };
      }
    })
  };

  channel(_name: string) {
    const builder = {
      on: () => builder,
      subscribe: () => builder
    };
    return builder;
  }

  removeChannel(_channel: any) {
    // no-op
  }

  auth = {
    signUp: async ({ email }: any) => {
      console.log(`[Mock Auth] Sign Up: ${email}`);
      const user = { id: 'mock-user-id-' + Math.random().toString(36).substring(2, 9), email };
      localStorage.setItem('mock_session', JSON.stringify({ user }));
      return { data: { user }, error: null };
    },
    signInWithPassword: async ({ email }: any) => {
      console.log(`[Mock Auth] Sign In: ${email}`);
      let user;
      if (email === 'admin@mock.city') {
        user = { id: 'mock-admin-id-1', email };
      } else {
        user = { id: 'mock-user-id-1', email };
      }
      localStorage.setItem('mock_session', JSON.stringify({ user }));
      return { data: { user, session: { user } }, error: null };
    },
    signOut: async () => {
      console.log(`[Mock Auth] Sign Out`);
      localStorage.removeItem('mock_session');
      return { error: null };
    },
    getSession: async () => {
      const sessionStr = localStorage.getItem('mock_session');
      if (sessionStr) {
        return { data: { session: JSON.parse(sessionStr) }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (_callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  };

  from(tableName: string) {
    const ensureSeededMockData = () => {
      const existingData = localStorage.getItem('mock_db_reports');
      if (existingData) {
        try {
          const parsed = JSON.parse(existingData);
          if (Array.isArray(parsed) && parsed.length >= 30) {
            return; // Already seeded with the latest data
          }
        } catch (_e) {
          // If parsing fails, fall through and re-seed
        }
      }

      console.log('[Mock Database] Seeding initial realistic demo data...');

      const mockReports = [
        {
          id: 'mock-report-1',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-1',
          image_url: 'https://picsum.photos/seed/pothole-1/800/600',
          description: 'Deep pothole in the middle of Commercial Street near the police station. It\'s causing traffic slowdowns and is very dangerous for two-wheelers.',
          latitude: 12.9730,
          longitude: 77.5955,
          category: 'pothole',
          severity: 'high',
          status: 'open',
          ward_id: 1,
          ai_analysis: {
            category: 'pothole',
            severity: 'high',
            explanation: 'Visual evidence of a deep asphalt road failure on a high-traffic street.',
            confidence: 0.94,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [300, 200, 700, 800], label: 'pothole' }
          },
          dedupe_hash: 'mock-dedupe-1'
        },
        {
          id: 'mock-report-2',
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-1',
          image_url: 'https://picsum.photos/seed/garbage-1/800/600',
          description: 'Municipal garbage container overflowing at the corner of MG Road. Trash is spilling onto the sidewalk, creating a bad smell.',
          latitude: 12.9710,
          longitude: 77.5940,
          category: 'garbage',
          severity: 'medium',
          status: 'in_progress',
          ward_id: 1,
          ai_analysis: {
            category: 'garbage',
            severity: 'medium',
            explanation: 'Overflowing public waste bin causing sidewalk blockage.',
            confidence: 0.88,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [150, 300, 800, 700], label: 'garbage' }
          },
          dedupe_hash: 'mock-dedupe-2'
        },
        {
          id: 'mock-report-3',
          created_at: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-2',
          image_url: 'https://picsum.photos/seed/light-1/800/600',
          description: 'Streetlight opposite standard chartered bank is completely dark. It\'s unsafe for pedestrians walking late at night.',
          latitude: 12.9355,
          longitude: 77.6250,
          category: 'streetlight',
          severity: 'low',
          status: 'resolved',
          ward_id: 2,
          ai_analysis: {
            category: 'streetlight',
            severity: 'low',
            explanation: 'A single out-of-order streetlight pole on a minor lane.',
            confidence: 0.91,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [50, 450, 900, 550], label: 'streetlight' }
          },
          dedupe_hash: 'mock-dedupe-3',
          after_image_url: 'https://picsum.photos/seed/resolve-3/800/600',
          worker_notes: 'Bulb replaced by ward maintenance team.',
          worker_thanked_at: new Date(Date.now() - 3.1 * 24 * 60 * 60 * 1000).toISOString(),
          worker_thanked_by: 'mock-user-id-1'
        },
        {
          id: 'mock-report-4',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-2',
          image_url: 'https://picsum.photos/seed/leak-1/800/600',
          description: 'Active water leakage from underground pipeline on 80 feet road. Clean water is wasting and pooling on the side of the road.',
          latitude: 12.9348,
          longitude: 77.6240,
          category: 'water leakage',
          severity: 'medium',
          status: 'open',
          ward_id: 2,
          ai_analysis: {
            category: 'water leakage',
            severity: 'medium',
            explanation: 'Continuous municipal water supply pipe joint leak.',
            confidence: 0.85,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [400, 100, 600, 900], label: 'water leakage' }
          },
          dedupe_hash: 'mock-dedupe-4'
        },
        {
          id: 'mock-report-5',
          created_at: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-3',
          image_url: 'https://picsum.photos/seed/drain-1/800/600',
          description: 'Stormwater drain is completely clogged with leaves and plastic debris. Water is pooling on the road.',
          latitude: 12.9725,
          longitude: 77.6415,
          category: 'drainage',
          severity: 'medium',
          status: 'in_progress',
          ward_id: 3,
          ai_analysis: {
            category: 'drainage',
            severity: 'medium',
            explanation: 'Debris clogging a storm drain grate, preventing water runoff.',
            confidence: 0.89,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [200, 300, 750, 700], label: 'drainage' }
          },
          dedupe_hash: 'mock-dedupe-5'
        },
        {
          id: 'mock-report-6',
          created_at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-3',
          image_url: 'https://picsum.photos/seed/light-2/800/600',
          description: 'Entire block of streetlights on 100 feet road is off. Pitch black and extremely risky for drivers.',
          latitude: 12.9712,
          longitude: 77.6408,
          category: 'streetlight',
          severity: 'high',
          status: 'open',
          ward_id: 3,
          ai_analysis: {
            category: 'streetlight',
            severity: 'high',
            explanation: 'Multiple adjacent street lamps out of order, representing high hazard.',
            confidence: 0.95,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [100, 200, 950, 800], label: 'streetlight' }
          },
          dedupe_hash: 'mock-dedupe-6'
        },
        {
          id: 'mock-report-7',
          created_at: new Date(Date.now() - 2.2 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-4',
          image_url: 'https://picsum.photos/seed/pothole-2/800/600',
          description: 'Minor cracks developing on the road surface near 4th block bus stop. Not a deep pothole yet, but needs monitoring.',
          latitude: 12.9312,
          longitude: 77.5842,
          category: 'pothole',
          severity: 'low',
          status: 'open',
          ward_id: 4,
          ai_analysis: {
            category: 'pothole',
            severity: 'low',
            explanation: 'Surface cracks and early pavement distress.',
            confidence: 0.81,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [450, 350, 550, 650], label: 'pothole' }
          },
          dedupe_hash: 'mock-dedupe-7'
        },
        {
          id: 'mock-report-8',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-4',
          image_url: 'https://picsum.photos/seed/leak-2/800/600',
          description: 'Major water pipe burst on 9th block main road. High-pressure water spraying out and flooding the street.',
          latitude: 12.9302,
          longitude: 77.5830,
          category: 'water leakage',
          severity: 'high',
          status: 'resolved',
          ward_id: 4,
          ai_analysis: {
            category: 'water leakage',
            severity: 'high',
            explanation: 'Severe high-pressure pipe burst causing street flooding.',
            confidence: 0.97,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [100, 100, 800, 800], label: 'water leakage' }
          },
          dedupe_hash: 'mock-dedupe-8',
          after_image_url: 'https://picsum.photos/seed/resolve-8/800/600',
          worker_notes: 'Water supply shut off, pipe repaired and asphalted over.'
        },
        {
          id: 'mock-report-9',
          created_at: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-5',
          image_url: 'https://picsum.photos/seed/drain-2/800/600',
          description: 'Sewer drain backing up and overflowing onto ITPL main road. Foul smell and hazardous conditions.',
          latitude: 12.9702,
          longitude: 77.7505,
          category: 'drainage',
          severity: 'high',
          status: 'needs_manual_review',
          ward_id: 5,
          ai_analysis: {
            category: 'drainage',
            severity: 'high',
            explanation: 'Severe sewer backup and street flooding.',
            confidence: 0.65,
            isValidCivicIssue: true,
            isBorderline: true,
            rejectionReason: 'Low confidence score (65%)',
            segmentation_mask: { box_2d: [250, 150, 800, 850], label: 'drainage' }
          },
          dedupe_hash: 'mock-dedupe-9'
        },
        {
          id: 'mock-report-10',
          created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-5',
          image_url: 'https://picsum.photos/seed/garbage-2/800/600',
          description: 'Huge pile of construction debris and plastic garbage dumped on the roadside near hope farm junction.',
          latitude: 12.9692,
          longitude: 77.7495,
          category: 'garbage',
          severity: 'high',
          status: 'open',
          ward_id: 5,
          ai_analysis: {
            category: 'garbage',
            severity: 'high',
            explanation: 'Large illegal dump of commercial/construction waste.',
            confidence: 0.92,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [200, 100, 850, 900], label: 'garbage' }
          },
          dedupe_hash: 'mock-dedupe-10'
        },
        {
          id: 'mock-report-11',
          created_at: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-1',
          image_url: 'https://picsum.photos/seed/light-3/800/600',
          description: 'Streetlight flickering continuously, disturbing nearby residential apartments.',
          latitude: 12.9722,
          longitude: 77.5952,
          category: 'streetlight',
          severity: 'low',
          status: 'open',
          ward_id: 1,
          ai_analysis: {
            category: 'streetlight',
            severity: 'low',
            explanation: 'Unstable bulb fixture or wiring issue.',
            confidence: 0.83,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [50, 400, 200, 600], label: 'streetlight' }
          },
          dedupe_hash: 'mock-dedupe-11'
        },
        {
          id: 'mock-report-12',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-3',
          image_url: 'https://picsum.photos/seed/leak-3/800/600',
          description: 'Water dripping from a municipal control valve valve on 12th main road.',
          latitude: 12.9715,
          longitude: 77.6410,
          category: 'water leakage',
          severity: 'low',
          status: 'resolved',
          ward_id: 3,
          ai_analysis: {
            category: 'water leakage',
            severity: 'low',
            explanation: 'Minor water drip around valve cap.',
            confidence: 0.89,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [300, 400, 500, 600], label: 'water leakage' }
          },
          dedupe_hash: 'mock-dedupe-12',
          after_image_url: 'https://picsum.photos/seed/resolve-12/800/600',
          worker_notes: 'Valve tightened and sealed.'
        },
        {
          id: 'mock-report-13',
          created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-2',
          image_url: 'https://picsum.photos/seed/drain-3/800/600',
          description: 'Drainage inlet covered in plastic wrappers and leaves near the supermarket entrance.',
          latitude: 12.9358,
          longitude: 77.6248,
          category: 'drainage',
          severity: 'low',
          status: 'open',
          ward_id: 2,
          ai_analysis: {
            category: 'drainage',
            severity: 'low',
            explanation: 'Surface litter blocking a drain grate.',
            confidence: 0.87,
            isValidCivicIssue: true,
            isBorderline: false,
            rejectionReason: '',
            segmentation_mask: { box_2d: [400, 300, 800, 700], label: 'drainage' }
          },
          dedupe_hash: 'mock-dedupe-13'
        },
        {
          id: 'mock-report-14',
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-5',
          image_url: 'https://picsum.photos/seed/pothole-3/800/600',
          description: 'Deep pothole near the railway overbridge. Vehicles are forced to brake suddenly to avoid it.',
          latitude: 12.9695,
          longitude: 77.7502,
          category: 'pothole',
          severity: 'medium',
          status: 'needs_manual_review',
          ward_id: 5,
          ai_analysis: {
            category: 'pothole',
            severity: 'medium',
            explanation: 'Pavement crater on a fast-moving traffic lane.',
            confidence: 0.68,
            isValidCivicIssue: true,
            isBorderline: true,
            rejectionReason: 'Low confidence score (68%)',
            segmentation_mask: { box_2d: [350, 400, 600, 700], label: 'pothole' }
          },
          dedupe_hash: 'mock-dedupe-14'
        },
        {
          id: 'mock-report-15',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-4',
          image_url: 'https://picsum.photos/seed/bottle-1/800/600',
          description: 'Just a test picture of a water bottle.',
          latitude: 12.9305,
          longitude: 77.5835,
          category: 'pothole',
          severity: 'medium',
          status: 'rejected',
          ward_id: 4,
          ai_analysis: {
            category: 'pothole',
            severity: 'medium',
            explanation: 'Image does not contain a valid public infrastructure issue.',
            confidence: 0.95,
            isValidCivicIssue: false,
            isBorderline: false,
            rejectionReason: 'The photo is invalid or does not contain a public space civic issue.',
            segmentation_mask: { box_2d: [0, 0, 0, 0], label: 'invalid' }
          },
          dedupe_hash: 'mock-dedupe-15'
        },
        {
          id: 'mock-report-16',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-6',
          image_url: 'https://picsum.photos/seed/pothole-4/800/600',
          description: 'Large crater near the Brigade Road intersection. Very dangerous at night.',
          latitude: 12.9740,
          longitude: 77.5960,
          category: 'pothole',
          severity: 'high',
          status: 'open',
          ward_id: 1,
          ai_analysis: { category: 'pothole', severity: 'high', explanation: 'Deep pothole on a major commercial street.', confidence: 0.96, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [350, 250, 650, 750], label: 'pothole' } },
          dedupe_hash: 'mock-dedupe-16'
        },
        {
          id: 'mock-report-17',
          created_at: new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-7',
          image_url: 'https://picsum.photos/seed/garbage-3/800/600',
          description: 'Illegal dumping site forming behind the old bakery.',
          latitude: 12.9720,
          longitude: 77.5930,
          category: 'garbage',
          severity: 'medium',
          status: 'resolved',
          ward_id: 1,
          ai_analysis: { category: 'garbage', severity: 'medium', explanation: 'Pile of uncollected waste on sidewalk.', confidence: 0.89, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [400, 300, 700, 800], label: 'garbage' } },
          dedupe_hash: 'mock-dedupe-17',
          after_image_url: 'https://picsum.photos/seed/resolve-17/800/600',
          worker_notes: 'Waste cleared and area sanitized.'
        },
        {
          id: 'mock-report-18',
          created_at: new Date(Date.now() - 5.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-8',
          image_url: 'https://picsum.photos/seed/light-4/800/600',
          description: 'Broken streetlight pole, looks like a vehicle hit it.',
          latitude: 12.9700,
          longitude: 77.5950,
          category: 'streetlight',
          severity: 'high',
          status: 'in_progress',
          ward_id: 1,
          ai_analysis: { category: 'streetlight', severity: 'high', explanation: 'Damaged street infrastructure posing physical hazard.', confidence: 0.94, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [100, 400, 900, 600], label: 'streetlight' } },
          dedupe_hash: 'mock-dedupe-18'
        },
        {
          id: 'mock-report-19',
          created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-6',
          image_url: 'https://picsum.photos/seed/leak-4/800/600',
          description: 'Water seeping through the road asphalt on 5th block.',
          latitude: 12.9360,
          longitude: 77.6250,
          category: 'water leakage',
          severity: 'medium',
          status: 'resolved',
          ward_id: 2,
          ai_analysis: { category: 'water leakage', severity: 'medium', explanation: 'Subsurface leak causing surface pooling.', confidence: 0.86, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [400, 200, 600, 800], label: 'water leakage' } },
          dedupe_hash: 'mock-dedupe-19',
          after_image_url: 'https://picsum.photos/seed/resolve-19/800/600',
          worker_notes: 'Underground pipe joint fixed.'
        },
        {
          id: 'mock-report-20',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-7',
          image_url: 'https://picsum.photos/seed/drain-4/800/600',
          description: 'Open manhole cover missing on the pedestrian path!',
          latitude: 12.9340,
          longitude: 77.6230,
          category: 'drainage',
          severity: 'high',
          status: 'open',
          ward_id: 2,
          ai_analysis: { category: 'drainage', severity: 'high', explanation: 'Missing manhole cover creates severe fall hazard.', confidence: 0.98, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [450, 400, 650, 600], label: 'drainage' } },
          dedupe_hash: 'mock-dedupe-20'
        },
        {
          id: 'mock-report-21',
          created_at: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-8',
          image_url: 'https://picsum.photos/seed/pothole-5/800/600',
          description: 'Multiple small potholes clustered together near the signal.',
          latitude: 12.9370,
          longitude: 77.6260,
          category: 'pothole',
          severity: 'low',
          status: 'open',
          ward_id: 2,
          ai_analysis: { category: 'pothole', severity: 'low', explanation: 'Cluster of minor surface degradation.', confidence: 0.88, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [300, 300, 700, 700], label: 'pothole' } },
          dedupe_hash: 'mock-dedupe-21'
        },
        {
          id: 'mock-report-22',
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-6',
          image_url: 'https://picsum.photos/seed/garbage-4/800/600',
          description: 'Overflowing bins outside the metro station.',
          latitude: 12.9730,
          longitude: 77.6420,
          category: 'garbage',
          severity: 'high',
          status: 'in_progress',
          ward_id: 3,
          ai_analysis: { category: 'garbage', severity: 'high', explanation: 'Massive overflow affecting pedestrian transit.', confidence: 0.95, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [200, 200, 800, 800], label: 'garbage' } },
          dedupe_hash: 'mock-dedupe-22'
        },
        {
          id: 'mock-report-23',
          created_at: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-7',
          image_url: 'https://picsum.photos/seed/light-5/800/600',
          description: 'Streetlight is on during the daytime, wasting energy.',
          latitude: 12.9700,
          longitude: 77.6400,
          category: 'streetlight',
          severity: 'low',
          status: 'needs_manual_review',
          ward_id: 3,
          ai_analysis: { category: 'streetlight', severity: 'low', explanation: 'Lamp operational during daylight hours.', confidence: 0.68, isValidCivicIssue: true, isBorderline: true, rejectionReason: 'Low confidence in hazard level.', segmentation_mask: { box_2d: [100, 450, 400, 550], label: 'streetlight' } },
          dedupe_hash: 'mock-dedupe-23'
        },
        {
          id: 'mock-report-24',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-8',
          image_url: 'https://picsum.photos/seed/leak-5/800/600',
          description: 'Water spraying from a broken community tap.',
          latitude: 12.9725,
          longitude: 77.6430,
          category: 'water leakage',
          severity: 'medium',
          status: 'resolved',
          ward_id: 3,
          ai_analysis: { category: 'water leakage', severity: 'medium', explanation: 'Broken tap causing continuous water waste.', confidence: 0.91, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [300, 400, 600, 600], label: 'water leakage' } },
          dedupe_hash: 'mock-dedupe-24',
          after_image_url: 'https://picsum.photos/seed/resolve-24/800/600',
          worker_notes: 'Tap fixture replaced.'
        },
        {
          id: 'mock-report-25',
          created_at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-6',
          image_url: 'https://picsum.photos/seed/drain-5/800/600',
          description: 'Storm drain completely blocked by construction sand.',
          latitude: 12.9290,
          longitude: 77.5820,
          category: 'drainage',
          severity: 'medium',
          status: 'open',
          ward_id: 4,
          ai_analysis: { category: 'drainage', severity: 'medium', explanation: 'Sediment blockage in drainage grate.', confidence: 0.89, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [400, 200, 700, 800], label: 'drainage' } },
          dedupe_hash: 'mock-dedupe-25'
        },
        {
          id: 'mock-report-26',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-7',
          image_url: 'https://picsum.photos/seed/pothole-6/800/600',
          description: 'Sinkhole forming in the middle of the residential cross road.',
          latitude: 12.9320,
          longitude: 77.5850,
          category: 'pothole',
          severity: 'high',
          status: 'in_progress',
          ward_id: 4,
          ai_analysis: { category: 'pothole', severity: 'high', explanation: 'Large depression indicating potential sinkhole.', confidence: 0.97, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [200, 200, 800, 800], label: 'pothole' } },
          dedupe_hash: 'mock-dedupe-26'
        },
        {
          id: 'mock-report-27',
          created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-8',
          image_url: 'https://picsum.photos/seed/garbage-5/800/600',
          description: 'Medical waste dumped near the local clinic.',
          latitude: 12.9310,
          longitude: 77.5840,
          category: 'garbage',
          severity: 'high',
          status: 'resolved',
          ward_id: 4,
          ai_analysis: { category: 'garbage', severity: 'high', explanation: 'Hazardous bio-waste dumped in public space.', confidence: 0.95, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [300, 300, 600, 700], label: 'garbage' } },
          dedupe_hash: 'mock-dedupe-27',
          after_image_url: 'https://picsum.photos/seed/resolve-27/800/600',
          worker_notes: 'Hazardous waste team dispatched and cleared.'
        },
        {
          id: 'mock-report-28',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-6',
          image_url: 'https://picsum.photos/seed/light-6/800/600',
          description: 'Wires hanging dangerously low from the streetlight pole.',
          latitude: 12.9680,
          longitude: 77.7490,
          category: 'streetlight',
          severity: 'high',
          status: 'open',
          ward_id: 5,
          ai_analysis: { category: 'streetlight', severity: 'high', explanation: 'Exposed live wiring at pedestrian height.', confidence: 0.99, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [100, 400, 800, 600], label: 'streetlight' } },
          dedupe_hash: 'mock-dedupe-28'
        },
        {
          id: 'mock-report-29',
          created_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-7',
          image_url: 'https://picsum.photos/seed/leak-6/800/600',
          description: 'Fire hydrant leaking slowly onto the pavement.',
          latitude: 12.9710,
          longitude: 77.7510,
          category: 'water leakage',
          severity: 'low',
          status: 'in_progress',
          ward_id: 5,
          ai_analysis: { category: 'water leakage', severity: 'low', explanation: 'Minor leak from municipal hydrant.', confidence: 0.85, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [500, 450, 700, 550], label: 'water leakage' } },
          dedupe_hash: 'mock-dedupe-29'
        },
        {
          id: 'mock-report-30',
          created_at: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000).toISOString(),
          reporter_id: 'mock-reporter-uuid-8',
          image_url: 'https://picsum.photos/seed/drain-6/800/600',
          description: 'Heavy rain caused the drain to overflow into nearby shops.',
          latitude: 12.9705,
          longitude: 77.7505,
          category: 'drainage',
          severity: 'high',
          status: 'resolved',
          ward_id: 5,
          ai_analysis: { category: 'drainage', severity: 'high', explanation: 'Severe drain failure causing property damage.', confidence: 0.96, isValidCivicIssue: true, isBorderline: false, rejectionReason: '', segmentation_mask: { box_2d: [100, 100, 900, 900], label: 'drainage' } },
          dedupe_hash: 'mock-dedupe-30',
          after_image_url: 'https://picsum.photos/seed/resolve-30/800/600',
          worker_notes: 'Drain unblocked and emergency pumping completed.'
        }
      ];

      const mockHistory = [
        {
          id: 'mock-hist-1',
          report_id: 'mock-report-3',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 3.4 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Investigating streetlight failure at Koramangala'
        },
        {
          id: 'mock-hist-2',
          report_id: 'mock-report-3',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 3.2 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-3/800/600',
          worker_notes: 'Bulb replaced by ward maintenance team.'
        },
        {
          id: 'mock-hist-3',
          report_id: 'mock-report-8',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 1.9 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Dispatching repair crew to shut off water main at Jayanagar.'
        },
        {
          id: 'mock-hist-4',
          report_id: 'mock-report-8',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-8/800/600',
          worker_notes: 'Water supply shut off, pipe repaired and asphalted over.'
        },
        {
          id: 'mock-hist-5',
          report_id: 'mock-report-12',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 0.9 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Checking water dripping from control valve.'
        },
        {
          id: 'mock-hist-6',
          report_id: 'mock-report-12',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 0.8 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-12/800/600',
          worker_notes: 'Valve tightened and sealed.'
        },
        {
          id: 'mock-hist-7',
          report_id: 'mock-report-17',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Investigating illegal dumping at old bakery.'
        },
        {
          id: 'mock-hist-8',
          report_id: 'mock-report-17',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 5.8 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-17/800/600',
          worker_notes: 'Waste cleared and area sanitized.'
        },
        {
          id: 'mock-hist-9',
          report_id: 'mock-report-19',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 5.5 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Checking water seeping through asphalt.'
        },
        {
          id: 'mock-hist-10',
          report_id: 'mock-report-19',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-19/800/600',
          worker_notes: 'Underground pipe joint fixed.'
        },
        {
          id: 'mock-hist-11',
          report_id: 'mock-report-24',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Checking broken tap.'
        },
        {
          id: 'mock-hist-12',
          report_id: 'mock-report-24',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-24/800/600',
          worker_notes: 'Tap fixture replaced.'
        },
        {
          id: 'mock-hist-13',
          report_id: 'mock-report-27',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Hazardous waste team dispatched.'
        },
        {
          id: 'mock-hist-14',
          report_id: 'mock-report-27',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-27/800/600',
          worker_notes: 'Hazardous waste team dispatched and cleared.'
        },
        {
          id: 'mock-hist-15',
          report_id: 'mock-report-30',
          from_status: 'open',
          to_status: 'in_progress',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 0.15 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'investigate',
          worker_notes: 'Emergency pump requested.'
        },
        {
          id: 'mock-hist-16',
          report_id: 'mock-report-30',
          from_status: 'in_progress',
          to_status: 'resolved',
          changed_by: 'mock-user-id-1',
          changed_at: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000).toISOString(),
          action_type: 'resolve',
          after_image_url: 'https://picsum.photos/seed/resolve-30/800/600',
          worker_notes: 'Drain unblocked and emergency pumping completed.'
        }
      ];

      const mockFeedback = [
        {
          id: 'mock-fb-1',
          report_id: 'mock-report-3',
          rating: 5,
          comment: 'Very fast resolution! The street is bright and safe again. Thank you!',
          created_at: new Date(Date.now() - 3.1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'mock-fb-2',
          report_id: 'mock-report-12',
          rating: 4,
          comment: 'Water leak stopped. Glad it was handled within a day.',
          created_at: new Date(Date.now() - 0.7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'mock-fb-3',
          report_id: 'mock-report-17',
          rating: 4,
          comment: 'Good work, area looks clean now.',
          created_at: new Date(Date.now() - 5.7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'mock-fb-4',
          report_id: 'mock-report-30',
          rating: 5,
          comment: 'Thanks for the quick emergency response!!',
          created_at: new Date(Date.now() - 0.05 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      localStorage.setItem('mock_db_reports', JSON.stringify(mockReports));
      localStorage.setItem('mock_db_report_status_history', JSON.stringify(mockHistory));
      localStorage.setItem('mock_db_report_feedback', JSON.stringify(mockFeedback));
    };

    const getItems = (): any[] => {
      try {
        ensureSeededMockData();
        return JSON.parse(localStorage.getItem(`mock_db_${tableName}`) || '[]');
      } catch {
        return [];
      }
    };
    const setItems = (items: any[]) => {
      localStorage.setItem(`mock_db_${tableName}`, JSON.stringify(items));
    };

    if (tableName === 'worker_profiles') {
      const getProfiles = () => {
        const stored = localStorage.getItem('mock_db_worker_profiles');
        if (stored) return JSON.parse(stored);
        const defaultProfiles = [
          { id: 'mock-user-id-1', email: 'worker@mock.city', ward_ids: [1], role: 'worker' },
          { id: 'mock-admin-id-1', email: 'admin@mock.city', ward_ids: [], role: 'admin' }
        ];
        localStorage.setItem('mock_db_worker_profiles', JSON.stringify(defaultProfiles));
        return defaultProfiles;
      };

      return {
        select: (_fields?: string) => {
          const builder = {
            data: getProfiles(),
            error: null as any,
            eq(col: string, val: any) {
                this.data = this.data.filter((i: any) => (i as any)[col] === val);
                return this;
              },
              contains(col: string, arr: any[]) {
                this.data = this.data.filter((i: any) => {
                  if (Array.isArray(i[col])) {
                     return arr.some(v => i[col].includes(v));
                  }
                  return false;
                });
                return this;
              },
            single() {
              return Promise.resolve({ data: this.data[0] || null, error: this.error });
            },
            then(onfulfilled: any) {
              return Promise.resolve({ data: this.data, error: this.error }).then(onfulfilled);
            }
          };
          return builder;
        },
        update: (updates: any) => {
          const builder = {
            eq(col: string, val: any) {
              const profiles = getProfiles();
              const idx = profiles.findIndex((p: any) => p[col] === val);
              if (idx !== -1) {
                profiles[idx] = { ...profiles[idx], ...updates };
                localStorage.setItem('mock_db_worker_profiles', JSON.stringify(profiles));
              }
              return { data: profiles, error: null };
            }
          };
          return builder;
        }
      };
    }

    if (tableName === 'admin_audit_logs') {
      const getLogs = () => {
        const stored = localStorage.getItem('mock_db_admin_audit_logs');
        return stored ? JSON.parse(stored) : [];
      };
      return {
        select: (_fields?: string) => {
          return {
            order: (_col: string, { ascending }: any) => {
              const logs = getLogs();
              if (!ascending) logs.reverse();
              return { data: logs, error: null };
            }
          };
        },
        insert: (log: any) => {
          const logs = getLogs();
          logs.push({
            id: 'mock-audit-' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            ...log
          });
          localStorage.setItem('mock_db_admin_audit_logs', JSON.stringify(logs));
          return { data: [log], error: null };
        }
      };
    }

    if (tableName === 'wards') {
      return {
        select: (_fields?: string) => {
          const builder = {
            data: LocationService.getWards(),
            error: null as any,
            eq(col: string, val: any) {
              this.data = this.data.filter(i => (i as any)[col] === val);
              return this;
            },
            single() {
              return Promise.resolve({ data: this.data[0] || null, error: this.error });
            },
            then(onfulfilled: any) {
              return Promise.resolve({ data: this.data, error: this.error }).then(onfulfilled);
            }
          };
          return builder;
        }
      };
    }
    
    if (tableName === 'cities') {
      return {
        select: (_fields?: string) => {
          const builder = {
            data: LocationService.getCities(),
            error: null as any,
            eq(col: string, val: any) {
              this.data = this.data.filter(i => (i as any)[col] === val);
              return this;
            },
            single() {
              return Promise.resolve({ data: this.data[0] || null, error: this.error });
            },
            then(onfulfilled: any) {
              return Promise.resolve({ data: this.data, error: this.error }).then(onfulfilled);
            }
          };
          return builder;
        }
      };
    }

    return {
      select(fields: string) {
        let items = getItems();
        if (fields.includes('wards')) {
          const allWards = LocationService.getWards();
          items = items.map(item => ({
            ...item,
            wards: allWards.find(w => item.ward_ids && item.ward_ids.includes(w.id)) || 
                   allWards.find(w => item.ward_id === w.id) || 
                   { name: 'Unknown Ward' }
          }));
        }
        
        const builder = {
          data: items,
          error: null as any,
          order(column: string, { ascending } = { ascending: false }) {
            this.data = [...this.data].sort((a, b) => {
              const valA = a[column];
              const valB = b[column];
              if (valA < valB) return ascending ? -1 : 1;
              if (valA > valB) return ascending ? 1 : -1;
              return 0;
            });
            return this;
          },
          eq(col: string, val: any) {
            this.data = this.data.filter(i => {
              if (col === 'ward_id' && (i as any).ward_ids) {
                return (i as any).ward_ids.includes(val);
              }
              return (i as any)[col] === val;
            });
            return this;
          },
          not(col: string, op: string, val: any) {
            if (op === 'eq') {
              this.data = this.data.filter(i => (i as any)[col] !== val);
            }
            return this;
          },
          gt(col: string, val: any) {
            this.data = this.data.filter(i => new Date(i[col]).getTime() > new Date(val).getTime());
            return this;
          },
          limit(n: number) {
            this.data = this.data.slice(0, n);
            return this;
          },
          then(onfulfilled: any) {
            return Promise.resolve({ data: this.data, error: this.error }).then(onfulfilled);
          }
        };
        return builder;
      },
      insert: (payload: any) => {
          const items = getItems();
          const payloadArray = Array.isArray(payload) ? payload : [payload];
          const newRecords = payloadArray.map(p => {
            let ward_id = p.ward_id;
            let ward_ids = p.ward_ids;
            
            // Auto-assign ward for new reports if missing
            if (tableName === 'reports' && !ward_id && !ward_ids && p.city_id) {
              const cityWards = LocationService.getWardsForCity(p.city_id);
              if (cityWards.length > 0) {
                // Mock simple distance assignment (just pick the first one for the mock demo)
                ward_id = cityWards[0].id;
                ward_ids = [ward_id];
              }
            }

            return {
              id: Math.random().toString(36).substring(2, 15),
              created_at: new Date().toISOString(),
              ...p,
              ward_id,
              ward_ids
            };
          });
          items.push(...newRecords);
          setItems(items);
          console.log(`[Mock Supabase DB] Inserted records into ${tableName}:`, newRecords);

          // Simulate AI Triage Delay if this is a new report
          if (tableName === 'reports' && newRecords[0].status === 'pending_triage') {
            setTimeout(() => {
              const currentItems = getItems();
              const idx = currentItems.findIndex(i => i.id === newRecords[0].id);
              if (idx > -1) {
                // Mock the triage result (make it High Severity for the demo)
                currentItems[idx].status = 'open';
                currentItems[idx].severity = 'high';
                currentItems[idx].category = 'emergency';
                currentItems[idx].ai_analysis = {
                  category: 'emergency',
                  severity: 'high',
                  explanation: '[Simulated Mock Triage] Automatic classification: High severity incident detected.',
                  confidence: 0.99,
                  isValidCivicIssue: true,
                  isBorderline: false
                };
                setItems(currentItems);

                // Dispatch event to trigger Worker notification
                window.dispatchEvent(new CustomEvent('mock-high-severity-alert', { detail: currentItems[idx] }));
              }
            }, 0); // 0ms simulated processing (fast for E2E)
          }

          return Promise.resolve({ data: newRecords, error: null });
        },
      update: (payload: any) => {
        const builder = {
          eq: (col: string, val: any) => {
            const items = getItems();
            const updated = items.map(item => {
              if (item[col] === val) {
                return { ...item, ...payload };
              }
              return item;
            });
            setItems(updated);
            console.log(`[Mock Supabase DB] Updated records in ${tableName} where ${col}=${val} with:`, payload);
            return Promise.resolve({ data: updated.filter(item => item[col] === val), error: null });
          }
        };
        return builder;
      }
    };
  }
}

// Helper to simulate network latency and log it
const simulateLatency = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Intercept methods to add latency and monitoring logs
const createMonitoredMock = () => {
  const mock = new MockSupabase() as any;
  
  const originalFrom = mock.from.bind(mock);
  mock.from = (tableName: string) => {
    function wrapQueryBuilder(builder: any): any {
      return new Proxy(builder, {
        get(target, prop, receiver) {
          if (prop === 'then') {
            if (typeof target.then === 'function') {
              return function(onFulfilled: any, onRejected: any) {
                const start = performance.now();
                return simulateLatency(50 + Math.random() * 200).then(() => {
                  return target.then((result: any) => {
                    const duration = Math.round(performance.now() - start);
                    SystemMonitoringService.logApiRequest(`/rest/v1/${tableName}`, 'QUERY', duration, !result.error);
                    return onFulfilled ? onFulfilled(result) : result;
                  }).catch((err: any) => {
                    const duration = Math.round(performance.now() - start);
                    SystemMonitoringService.logApiRequest(`/rest/v1/${tableName}`, 'QUERY', duration, false);
                    return onRejected ? onRejected(err) : Promise.reject(err);
                  });
                });
              };
            }
          }
          if (typeof target[prop] === 'function') {
            return function(...args: any[]) {
              const res = target[prop].apply(target, args);
              // If the method returns a promise (like single(), insert(), update() might), we should wrap the promise with monitoring
              if (res && typeof res.then === 'function') {
                 if (prop === 'single' || prop === 'insert' || prop === 'update') {
                   // wrapQueryBuilder will intercept its .then
                 }
              }
              // Return wrapped builder for chaining
              return wrapQueryBuilder(res);
            };
          }
          return Reflect.get(target, prop, receiver);
        }
      });
    }

    return wrapQueryBuilder(originalFrom(tableName));
  };

  return mock;
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMonitoredMock();

