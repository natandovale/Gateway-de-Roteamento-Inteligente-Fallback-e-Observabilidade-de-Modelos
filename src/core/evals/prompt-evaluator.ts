export interface EvaluationCriteria {
  requiredKeywords?: string[];
  mustContainJson?: boolean;
  minWordCount?: number;
  maxLatencyMs?: number;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  details: {
    missingKeywords?: string[];
    jsonValid?: boolean;
    wordCount?: number;
    latencyAcceptable?: boolean;
    latencyReason?: string;
  };
}

export interface EvaluationContext {
  latencyMs?: number;
}

export class PromptEvaluator {
  public evaluate(
    responseText: string,
    criteria: EvaluationCriteria,
    context?: EvaluationContext
  ): EvaluationResult {
    const details: EvaluationResult['details'] = {};
    let penalty = 0;

    // 1. Validação de Keywords
    if (criteria.requiredKeywords && criteria.requiredKeywords.length > 0) {
      const missing = criteria.requiredKeywords.filter(
        (kw) => !responseText.toLowerCase().includes(kw.toLowerCase())
      );
      if (missing.length > 0) {
        details.missingKeywords = missing;
        penalty += (missing.length / criteria.requiredKeywords.length) * 0.5;
      }
    }

    // 2. Validação de JSON
    if (criteria.mustContainJson) {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/{[\s\S]*}/);
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[1] ?? jsonMatch[0];
          JSON.parse(jsonStr);
          details.jsonValid = true;
        } catch {
          details.jsonValid = false;
          penalty += 0.5;
        }
      } else {
        details.jsonValid = false;
        penalty += 0.5;
      }
    }

    // 3. Validação de Contagem de Palavras
    const words = responseText.trim().split(/\s+/).filter(Boolean);
    details.wordCount = words.length;
    if (criteria.minWordCount && words.length < criteria.minWordCount) {
      penalty += 0.3;
    }

    // 4. Validação de SLA de Latência
    if (criteria.maxLatencyMs !== undefined && context?.latencyMs !== undefined) {
      if (context.latencyMs > criteria.maxLatencyMs) {
        details.latencyAcceptable = false;
        details.latencyReason = `Latência ${context.latencyMs}ms excedeu o SLA de ${criteria.maxLatencyMs}ms`;
        penalty += 0.4;
      } else {
        details.latencyAcceptable = true;
      }
    }

    const score = Math.max(0, Math.round((1.0 - penalty) * 100) / 100);
    const passed = score >= 0.7 && !details.missingKeywords && details.jsonValid !== false && details.latencyAcceptable !== false;

    return {
      passed,
      score,
      details,
    };
  }
}
