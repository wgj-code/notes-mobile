import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';
import type { Note } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const NODE_RADIUS = 28;

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  links: string[]; // titles of linked notes
}

interface GraphEdge {
  from: string; // note id
  to: string;   // note id
}

/** Extract [[wiki-link]] titles from note content */
function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const title = match[1].trim();
    if (title && !links.includes(title)) {
      links.push(title);
    }
  }
  return links;
}

/** Simple force-directed layout: random initial placement, then relax */
function computeLayout(notes: Note[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const titleToId = new Map<string, string>();
  notes.forEach((n) => titleToId.set(n.title.toLowerCase(), n.id));

  // Build nodes with initial random positions
  const nodes: GraphNode[] = notes.map((note, i) => {
    const angle = (2 * Math.PI * i) / Math.max(notes.length, 1);
    const radius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3;
    return {
      id: note.id,
      title: note.title,
      x: SCREEN_WIDTH / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
      y: SCREEN_HEIGHT / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
      links: extractWikiLinks(note.content),
    };
  });

  // Build edges
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  for (const node of nodes) {
    for (const linkedTitle of node.links) {
      const targetId = titleToId.get(linkedTitle.toLowerCase());
      if (targetId && targetId !== node.id) {
        const key = [node.id, targetId].sort().join('--');
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from: node.id, to: targetId });
        }
      }
    }
  }

  // Simple relaxation: push apart, pull together
  const iterations = 60;
  const repulsion = 3000;
  const attraction = 0.005;
  const damping = 0.9;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = nodes.map(() => ({ fx: 0, fy: 0 }));

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[i].fx += fx;
        forces[i].fy += fy;
        forces[j].fx -= fx;
        forces[j].fy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const i = nodes.findIndex((n) => n.id === edge.from);
      const j = nodes.findIndex((n) => n.id === edge.to);
      if (i < 0 || j < 0) continue;
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const fx = dx * attraction;
      const fy = dy * attraction;
      forces[i].fx += fx;
      forces[i].fy += fy;
      forces[j].fx -= fx;
      forces[j].fy -= fy;
    }

    // Center gravity
    for (let i = 0; i < nodes.length; i++) {
      forces[i].fx += (SCREEN_WIDTH / 2 - nodes[i].x) * 0.001;
      forces[i].fy += (SCREEN_HEIGHT / 2 - nodes[i].y) * 0.001;
    }

    // Apply forces
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x += forces[i].fx * damping;
      nodes[i].y += forces[i].fy * damping;
      // Keep within bounds
      nodes[i].x = Math.max(NODE_RADIUS + 8, Math.min(SCREEN_WIDTH - NODE_RADIUS - 8, nodes[i].x));
      nodes[i].y = Math.max(NODE_RADIUS + 8, Math.min(SCREEN_HEIGHT - NODE_RADIUS - 8, nodes[i].y));
    }
  }

  return { nodes, edges };
}

export default function GraphScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { notes } = useNotesStore();

  const [layout] = useState(() => computeLayout(notes));

  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  const handleNodeTap = useCallback(
    (nodeId: string) => {
      const note = notes.find((n) => n.id === nodeId);
      if (note) {
        navigation.navigate('NoteDetail', { noteId: note.id, note });
      }
    },
    [notes, navigation]
  );

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('notes.noNotesYet')}</Text>
        </View>
      ) : (
        <View style={styles.graphContainer}>
          {/* Draw edges as simple lines using positioned views */}
          {layout.edges.map((edge, idx) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            return (
              <View
                key={`edge-${idx}`}
                style={[
                  styles.edge,
                  {
                    width: length,
                    left: from.x,
                    top: from.y,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}

          {/* Draw nodes */}
          {layout.nodes.map((node) => (
            <TouchableOpacity
              key={node.id}
              style={[
                styles.node,
                {
                  left: node.x - NODE_RADIUS,
                  top: node.y - NODE_RADIUS,
                },
              ]}
              onPress={() => handleNodeTap(node.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.nodeLabel} numberOfLines={2}>
                {node.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    graphContainer: {
      flex: 1,
      position: 'relative',
    },
    edge: {
      position: 'absolute',
      height: 1.5,
      backgroundColor: c.border,
      transformOrigin: 'left center',
    },
    node: {
      position: 'absolute',
      width: NODE_RADIUS * 2,
      height: NODE_RADIUS * 2,
      borderRadius: NODE_RADIUS,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    nodeLabel: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: 2,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSize.lg,
      color: c.textSecondary,
    },
  });
}
