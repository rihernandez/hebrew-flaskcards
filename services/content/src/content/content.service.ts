import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { CreateWordDto } from './dto/create-word.dto';
import { ListWordsDto } from './dto/list-words.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import {
  DICTADO_LEVELS,
  LECTURA_PARAGRAPHS,
  SITUATIONS_ES,
  TRANSLATION_PAIRS,
} from './data/speaking-content';
import { ConfigRecord, ConfigRecordDocument } from './schemas/config-record.schema';
import { LanguageRecord, LanguageDocument } from './schemas/language.schema';
import { TopicRecord, TopicDocument } from './schemas/topic.schema';
import { Word, WordDocument } from './schemas/word.schema';

type SeedSourcePreference = 'mobile' | 'root' | 'auto';

@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectModel(Word.name) private readonly wordModel: Model<WordDocument>,
    @InjectModel(LanguageRecord.name) private readonly languageModel: Model<LanguageDocument>,
    @InjectModel(TopicRecord.name) private readonly topicModel: Model<TopicDocument>,
    @InjectModel(ConfigRecord.name) private readonly configRecordModel: Model<ConfigRecordDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.wordModel.estimatedDocumentCount();
    if (count === 0) {
      const result = await this.seedFromJson({ force: false, sourcePreference: 'mobile' });
      this.logger.log(`Words seeded from JSON: ${result.insertedWords}`);
    }
  }

  async getLanguages() {
    return this.languageModel.find({}).sort({ name: 1 }).lean();
  }

  async getTopics(language?: string) {
    const filter = language ? { language } : {};
    return this.topicModel.find(filter).sort({ language: 1, name: 1 }).lean();
  }

  async listWords(query: ListWordsDto) {
    const {
      language,
      topic,
      q,
      page = 1,
      limit = 50,
      sortBy = 'word',
      sortOrder = 'asc',
    } = query;

    const filter: FilterQuery<WordDocument> = {};
    if (language) filter.language = language;
    if (topic) filter.topic = topic;
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { word: { $regex: safe, $options: 'i' } },
        { meaning: { $regex: safe, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 } as const;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.wordModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.wordModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getWordById(id: string) {
    const found = await this.wordModel.findById(id).lean();
    if (!found) {
      throw new NotFoundException(`Word not found: ${id}`);
    }
    return found;
  }

  async createWord(dto: CreateWordDto) {
    const created = await this.wordModel.create(normalizeWordPayload(dto));
    await this.rebuildCatalogCollections();
    return created;
  }

  async replaceWord(id: string, dto: CreateWordDto) {
    const replaced = await this.wordModel
      .findOneAndReplace({ _id: id }, normalizeWordPayload(dto), {
        new: true,
        runValidators: true,
      })
      .lean();

    if (!replaced) {
      throw new NotFoundException(`Word not found: ${id}`);
    }

    await this.rebuildCatalogCollections();
    return replaced;
  }

  async updateWord(id: string, dto: UpdateWordDto) {
    const payload = normalizeWordPayload(dto);
    const updated = await this.wordModel
      .findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      })
      .lean();

    if (!updated) {
      throw new NotFoundException(`Word not found: ${id}`);
    }

    await this.rebuildCatalogCollections();
    return updated;
  }

  async deleteWord(id: string) {
    const deleted = await this.wordModel.findByIdAndDelete(id).lean();
    if (!deleted) {
      throw new NotFoundException(`Word not found: ${id}`);
    }

    await this.rebuildCatalogCollections();
    return { deleted: true, id };
  }

  async seedFromJson(options?: { force?: boolean; sourcePreference?: SeedSourcePreference }) {
    const force = Boolean(options?.force);
    const sourcePreference = options?.sourcePreference ?? 'mobile';

    const sourcePath = resolveWordsJsonPath(sourcePreference);
    if (!sourcePath) {
      throw new BadRequestException('Could not locate flashcards.words.json in expected locations.');
    }

    const raw = fs.readFileSync(sourcePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('words JSON payload must be an array.');
    }

    const words: Array<Partial<Word>> = [];
    const nonWordRecords: Array<Record<string, unknown>> = [];

    for (const row of parsed) {
      if (row && typeof row === 'object') {
        const normalized = normalizeWordPayload(row as Partial<Word>);
        if (isPersistableWord(normalized)) {
          words.push(normalized);
        } else {
          nonWordRecords.push(row as Record<string, unknown>);
        }
      }
    }

    if (words.length === 0) {
      throw new BadRequestException('No valid words found in JSON source.');
    }

    if (force) {
      await Promise.all([
        this.wordModel.deleteMany({}),
        this.languageModel.deleteMany({}),
        this.topicModel.deleteMany({}),
        this.configRecordModel.deleteMany({ source: 'words_json_non_word' }),
      ]);
    } else {
      const existing = await this.wordModel.estimatedDocumentCount();
      if (existing > 0) {
        return {
          sourcePath,
          sourcePreference,
          insertedWords: 0,
          insertedConfigRecords: 0,
          skipped: true,
          reason: 'collection-not-empty',
        };
      }
    }

    const insertedWords = (await this.wordModel.insertMany(words, { ordered: false })).length;

    let insertedConfigRecords = 0;
    if (nonWordRecords.length > 0) {
      const insertedConfigs = await this.configRecordModel.insertMany(
        nonWordRecords.map((payload) => ({ source: 'words_json_non_word', payload })),
        { ordered: false },
      );
      insertedConfigRecords = insertedConfigs.length;
    }

    await this.rebuildCatalogCollections();

    const [languagesCount, topicsCount] = await Promise.all([
      this.languageModel.estimatedDocumentCount(),
      this.topicModel.estimatedDocumentCount(),
    ]);

    return {
      sourcePath,
      sourcePreference,
      force,
      skipped: false,
      parsedRows: parsed.length,
      insertedWords,
      insertedConfigRecords,
      languagesCount,
      topicsCount,
    };
  }

  getSpeakingSituations(count = 2) {
    return [...SITUATIONS_ES].sort(() => Math.random() - 0.5).slice(0, count);
  }

  getTranslationPairs(count = 5) {
    return [...TRANSLATION_PAIRS].sort(() => Math.random() - 0.5).slice(0, count);
  }

  getLecturaParagraph() {
    return LECTURA_PARAGRAPHS[Math.floor(Math.random() * LECTURA_PARAGRAPHS.length)];
  }

  getDictadoLevels() {
    return DICTADO_LEVELS;
  }

  private async rebuildCatalogCollections() {
    const [languageRows, topicRows] = await Promise.all([
      this.wordModel.aggregate<{ _id: string; wordsCount: number; topics: string[] }>([
        {
          $group: {
            _id: '$language',
            wordsCount: { $sum: 1 },
            topics: { $addToSet: '$topic' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.wordModel.aggregate<{ _id: { language: string; topic: string }; wordsCount: number }>([
        {
          $group: {
            _id: { language: '$language', topic: '$topic' },
            wordsCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.language': 1, '_id.topic': 1 } },
      ]),
    ]);

    await Promise.all([
      this.languageModel.deleteMany({}),
      this.topicModel.deleteMany({}),
    ]);

    if (languageRows.length > 0) {
      await this.languageModel.insertMany(
        languageRows.map((row) => ({
          name: row._id,
          wordsCount: row.wordsCount,
          topicsCount: row.topics.length,
        })),
      );
    }

    if (topicRows.length > 0) {
      await this.topicModel.insertMany(
        topicRows.map((row) => ({
          language: row._id.language,
          name: row._id.topic,
          wordsCount: row.wordsCount,
        })),
      );
    }
  }
}

function normalizeWordPayload<T extends Partial<Word>>(data: T): T {
  const normalized: Partial<Word> = { ...data };

  delete (normalized as Record<string, unknown>)._id;
  delete (normalized as Record<string, unknown>).id;

  if (typeof normalized.word === 'string') normalized.word = normalized.word.trim();
  if (typeof normalized.pronunciation === 'string') normalized.pronunciation = normalized.pronunciation.trim();
  if (typeof normalized.meaning === 'string') normalized.meaning = normalized.meaning.trim();
  if (typeof normalized.language === 'string') normalized.language = normalized.language.trim();
  if (typeof normalized.topic === 'string') normalized.topic = normalized.topic.trim();
  if (typeof normalized.category === 'string') normalized.category = normalized.category.trim();
  if (typeof normalized.genre === 'string') normalized.genre = normalized.genre.trim();
  if (Array.isArray(normalized.examples)) {
    normalized.examples = normalized.examples
      .filter((example): example is string => typeof example === 'string')
      .map((example) => example.trim())
      .filter(Boolean);
  }

  return normalized as T;
}

function resolveWordsJsonPath(sourcePreference: SeedSourcePreference): string | null {
  const mobileCandidates = [
    '/mobile-assets/flashcards.words.json',
    path.resolve(process.cwd(), '../../mobile-app/assets/flashcards.words.json'),
    path.resolve(process.cwd(), '../../../mobile-app/assets/flashcards.words.json'),
  ];

  const rootCandidates = [
    '/flashcards.words.json',
    path.resolve(process.cwd(), '../../flashcards.words.json'),
    path.resolve(process.cwd(), '../../../flashcards.words.json'),
    path.resolve(process.cwd(), '../flashcards.words.json'),
  ];

  const candidates =
    sourcePreference === 'mobile'
      ? [...mobileCandidates, ...rootCandidates]
      : sourcePreference === 'root'
      ? [...rootCandidates, ...mobileCandidates]
      : [...mobileCandidates, ...rootCandidates];

  const uniqueCandidates = Array.from(new Set(candidates));
  for (const candidate of uniqueCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isPersistableWord(row: Partial<Word>): boolean {
  return (
    typeof row.word === 'string' &&
    row.word.trim().length > 0 &&
    typeof row.pronunciation === 'string' &&
    row.pronunciation.trim().length > 0 &&
    typeof row.meaning === 'string' &&
    row.meaning.trim().length > 0 &&
    typeof row.language === 'string' &&
    row.language.trim().length > 0 &&
    typeof row.topic === 'string' &&
    row.topic.trim().length > 0 &&
    Array.isArray(row.examples)
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
