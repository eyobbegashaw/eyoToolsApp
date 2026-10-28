import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface MarkdownStats {
  words: number;
  chars: number;
  lines: number;
  paragraphs: number;
  readTimeMinutes: number;
}

export interface MarkdownTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
}

export class MarkdownService {
  /**
   * Calculate text metrics
   */
  static calculateStats(text: string): MarkdownStats {
    const chars = text.length;
    const lines = text.length === 0 ? 0 : text.split('\n').length;
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const paragraphs = text
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0).length;
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));

    return {
      words,
      chars,
      lines,
      paragraphs,
      readTimeMinutes,
    };
  }

  /**
   * Export markdown file to device and open Android share sheet
   */
  static async exportMarkdown(content: string, filename = 'document.md') {
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/markdown',
        dialogTitle: 'Export Markdown File',
      });
    }
  }

  /**
   * Export as formatted document text
   */
  static async exportFormattedDocument(content: string, filename = 'document.txt') {
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Export Document',
      });
    }
  }

  /**
   * Curated Computer Science templates
   */
  static getTemplates(): MarkdownTemplate[] {
    return [
      {
        id: 'cs_notes',
        title: 'CS Lecture & Algorithm Notes',
        description: 'Structured notes for Data Structures, Graph Theory, and Complexity',
        content: `# CS 301: Data Structures & Algorithms

> Instructor: Dr. Begashaw  
> Topic: Graph Algorithms & Shortest Path  
> Date: ${new Date().toLocaleDateString()}

---

## 1. Dijkstra's Algorithm Overview
Dijkstra's algorithm finds the shortest paths between nodes in a weighted graph with non-negative edge weights.

### Key Characteristics:
- Greedy approach: Always expands the lowest distance unvisited vertex.
- Priority Queue: Typically implemented with a Min-Heap.
- Time Complexity: O((V + E) log V) using a binary heap.
- Limitation: Fails when negative edge weights are present.

---

## 2. Pseudocode Implementation
\`\`\`python
import heapq

def dijkstra(graph, start):
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    priority_queue = [(0, start)]

    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)
        if current_distance > distances[current_node]:
            continue

        for neighbor, weight in graph[current_node].items():
            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(priority_queue, (distance, neighbor))

    return distances
\`\`\`

---

## 3. Asymptotic Analysis
- Array: O(V^2)
- Binary Heap: O((V+E) log V)
- Fibonacci Heap: O(E + V log V)
`,
      },
      {
        id: 'project_readme',
        title: 'Project README.md',
        description: 'Standard professional README for GitHub repository',
        content: `# eyoTools Mobile Toolkit

> A premier, offline-first mobile utility toolkit for Computer Science students and software engineers.

---

## Features
- Document Converter: Word (DOCX) ↔ PDF, PowerPoint (PPTX) ↔ PDF, Markdown ↔ PDF.
- Markdown Studio: Live side-by-side editing, syntax highlighting, and document export.
- PDF Extraction: Offline text parsing and structure preservation.
- Text-to-Speech: Device-native audio reading with speed and pitch control.
- On-Device OCR: Tesseract Latin & Ethiopic (Amharic) glyph recognition.
- QR Toolkit: QR matrix generator and real-time camera scanner.
- Steganography: 16-bit LSB pixel-level message hiding and extraction.
- Background Remover: 4-corner Euclidean color variance mask generator.

---

## Author
Dn Eyob Begashaw
Computer Science Student & Software Engineer
Addis Ababa, Ethiopia
`,
      },
    ];
  }
}
