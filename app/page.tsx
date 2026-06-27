'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [question, setQuestion] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [translation, setTranslation] = useState('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const totalQuestions = 10
  const [finished, setFinished] = useState(false)
  const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categoryStats, setCategoryStats] = useState<any>({})
  const [answered, setAnswered] = useState(false)
  const answeredRef = useRef(false)

  const [totalSimulados, setTotalSimulados] = useState(0)
  const [melhorNota, setMelhorNota] = useState(0)
  const [ultimaNota, setUltimaNota] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    loadQuestion('all', [])
    loadHistory()
  }, [])

  function getCategoryLabel(category: string) {
    if (category === 'translation') return 'Tradução'
    if (category === 'vocabulary') return 'Vocabulário'
    if (category === 'grammar') return 'Gramática'
    if (category === 'reading') return 'Leitura'
    if (category === 'listening') return 'Audição'
    return category
  }

  function shuffleArray(array: any[]) {
    return [...array].sort(() => Math.random() - 0.5)
  }

  function getWeakestCategory(statsData = categoryStats) {
    const entries = Object.entries(statsData)

    if (entries.length === 0) return null

    let weakest: any = null

    entries.forEach(([category, stats]: any) => {
      const total = stats.correct + stats.wrong
      const percent = total > 0 ? (stats.correct / total) * 100 : 0

      if (!weakest || percent < weakest.percent) {
        weakest = {
          category,
          percent: Math.round(percent),
          correct: stats.correct,
          wrong: stats.wrong,
        }
      }
    })

    return weakest
  }

  function getPerformanceLevel() {
  const percentage = Math.round((correctCount / totalQuestions) * 100)

  if (percentage === 100) {
    return {
      title: 'Excelente',
      emoji: '🏆',
      color: '#166534',
      background: '#DCFCE7',
      message:
        'Você acertou tudo! Continue treinando para manter esse nível até o dia da prova.',
    }
  }

  if (percentage >= 80) {
    return {
      title: 'Muito bom',
      emoji: '✅',
      color: '#166534',
      background: '#DCFCE7',
      message:
        'Você está no caminho certo para passar no JLPT N4. Continue praticando para ganhar velocidade e confiança.',
    }
  }

  if (percentage >= 60) {
    return {
      title: 'Intermediário',
      emoji: '⚠️',
      color: '#92400E',
      background: '#FEF3C7',
      message:
        'Você já tem uma boa base, mas ainda precisa reforçar alguns pontos antes da prova.',
    }
  }

  return {
    title: 'Precisa reforçar',
    emoji: '📚',
    color: '#991B1B',
    background: '#FEE2E2',
    message:
      'Ainda é melhor revisar o conteúdo com calma. Treine vocabulário, gramática e traduções todos os dias.',
  }
}

function getStudyPlan() {
  const weakest = getWeakestCategory()

  if (!weakest) {
    return [
      'Faça mais um simulado para identificar seus pontos fortes e fracos.',
      'Revise vocabulário N4 por 15 minutos.',
      'Treine frases curtas em japonês com tradução em português.',
    ]
  }

  if (weakest.category === 'vocabulary') {
    return [
      'Revise 20 palavras de vocabulário N4.',
      'Crie frases simples usando as palavras que errou.',
      'Faça mais um simulado focando em vocabulário.',
    ]
  }

  if (weakest.category === 'grammar') {
    return [
      'Revise partículas e estruturas gramaticais N4.',
      'Leia exemplos curtos em japonês e tente traduzir.',
      'Faça mais um simulado focando em gramática.',
    ]
  }

  if (weakest.category === 'translation') {
    return [
      'Treine tradução de frases curtas do japonês para português.',
      'Observe o verbo, a partícula e o tempo da frase.',
      'Faça mais um simulado focando em compreensão geral.',
    ]
  }

  return [
    'Revise o conteúdo da categoria com menor aproveitamento.',
    'Faça anotações dos erros mais comuns.',
    'Repita o simulado para acompanhar sua evolução.',
  ]
}

  async function loadHistory() {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.log('Erro ao carregar histórico:', error)
      return
    }

    if (!data || data.length === 0) {
      setTotalSimulados(0)
      setMelhorNota(0)
      setUltimaNota(0)
      return
    }

    setTotalSimulados(data.length)
    setUltimaNota(data[0].percentage)

    const best = Math.max(...data.map((item: any) => item.percentage))
    setMelhorNota(best)
  }

  async function saveQuizResult(finalScore: number, finalStats: any) {
    const percentage = Math.round((finalScore / totalQuestions) * 100)
    const weakest = getWeakestCategory(finalStats)

    const { error } = await supabase.from('quiz_results').insert([
      {
        score: finalScore,
        total_questions: totalQuestions,
        percentage: percentage,
        weakest_category: weakest?.category || null,
      },
    ])

    if (error) {
      console.log('Erro ao salvar resultado:', error)
      alert(JSON.stringify(error))
      return
    }

    console.log('Resultado salvo com sucesso!')
    loadHistory()
  }

  function resetQuiz() {
    setCorrectCount(0)
    setWrongCount(0)
    setCategoryStats({})
    setQuestionNumber(1)
    setUsedQuestionIds([])
    setFinished(false)
    setFeedback('')
    setTranslation('')
    setAnswers([])
    setQuestion(null)
    setAnswered(false)
    answeredRef.current = false
  }

  async function loadQuestion(
    categoryValue = selectedCategory,
    usedIds = usedQuestionIds
  ) {
    setFeedback('')
    setTranslation('')
    setAnswered(false)
    answeredRef.current = false

    let query = supabase.from('questions').select('*')

    if (categoryValue !== 'all') {
      query = query.eq('category', categoryValue)
    }

    const { data: questions, error: questionError } = await query

    if (questionError) {
      alert(JSON.stringify(questionError))
      return
    }

    if (!questions || questions.length === 0) {
      alert('Nenhuma pergunta encontrada.')
      return
    }

    const availableQuestions = questions.filter(
      (q) => !usedIds.includes(q.id)
    )

    if (availableQuestions.length === 0) {
      setFinished(true)
      return
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length)
    const q = availableQuestions[randomIndex]

    const { data: respostas, error: answerError } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', q.id)

    if (answerError) {
      alert(JSON.stringify(answerError))
      return
    }

    if (!respostas || respostas.length === 0) {
      const newUsedIds = [...usedIds, q.id]
      setUsedQuestionIds(newUsedIds)
      loadQuestion(categoryValue, newUsedIds)
      return
    }

    const newUsedIds = [...usedIds, q.id]
    setUsedQuestionIds(newUsedIds)
    setQuestion(q)
    setAnswers(shuffleArray(respostas || []))
  }

  function handleAnswer(a: any) {
    if (answeredRef.current) return

    answeredRef.current = true
    setAnswered(true)

    const category = question?.category || 'translation'
    const current = categoryStats[category] || { correct: 0, wrong: 0 }

    const newCategoryStats = {
      ...categoryStats,
      [category]: {
        correct: current.correct + (a.is_correct ? 1 : 0),
        wrong: current.wrong + (a.is_correct ? 0 : 1),
      },
    }

    setCategoryStats(newCategoryStats)

    const newCorrectCount = correctCount + (a.is_correct ? 1 : 0)
    const newWrongCount = wrongCount + (a.is_correct ? 0 : 1)

    if (a.is_correct) {
      setCorrectCount(newCorrectCount)
      setFeedback('✅ Correto!')
      setTranslation(a.answer_text)
    } else {
      setWrongCount(newWrongCount)
      setFeedback('❌ Errado!')
      const correct = answers.find((ans) => ans.is_correct)
      setTranslation(correct?.answer_text || '')
    }

    setTimeout(() => {
      if (questionNumber >= totalQuestions) {
        setFinished(true)
        saveQuizResult(newCorrectCount, newCategoryStats)
      } else {
        setQuestionNumber((prev) => prev + 1)
        loadQuestion()
      }
    }, 1800)
  }

  return (
    <main
  style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #eff6ff, #ffffff)',
    padding: '16px',
    fontFamily: 'Arial',
    boxSizing: 'border-box',
  }}
>
      <div
  style={{
    width: '100%',
    maxWidth: 650,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 24,
    padding: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
    boxSizing: 'border-box',
  }}
>
 <h1
  style={{
    fontSize: 'clamp(26px, 6vw, 34px)',
    fontWeight: 'bold',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 8,
  }}
>
  JLPT N4 PASS 🇯🇵
</h1>

        <p style={{ textAlign: 'center', color: '#6b7280' }}>
          Treine japonês com questões estilo JLPT N4
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 20,
          }}
        >
          {[
            { label: 'Todos', value: 'all' },
            { label: 'Tradução', value: 'translation' },
            { label: 'Vocabulário', value: 'vocabulary' },
            { label: 'Gramática', value: 'grammar' },
          ].map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setSelectedCategory(cat.value)
                resetQuiz()
                setTimeout(() => {
                  loadQuestion(cat.value, [])
                }, 200)
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid #1E3A8A',
                background:
                  selectedCategory === cat.value ? '#1E3A8A' : '#ffffff',
                color:
                  selectedCategory === cat.value ? '#ffffff' : '#1E3A8A',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {started && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              color: '#374151',
              fontWeight: 'bold',
            }}
          >
            <span>
              Pergunta {questionNumber} de {totalQuestions}
            </span>
            <span>{Math.round((questionNumber / totalQuestions) * 100)}%</span>
          </div>

          <div
            style={{
              width: '100%',
              height: 14,
              background: '#e5e7eb',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(questionNumber / totalQuestions) * 100}%`,
                height: '100%',
                background: '#22C55E',
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
        )}


        <div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
    background: '#f3f4f6',
    padding: 16,
    borderRadius: 16,
    fontSize: 'clamp(15px, 4vw, 18px)',
    flexWrap: 'wrap',
  }}
>
          <span>✅ Acertos: {correctCount}</span>
          <span>❌ Erros: {wrongCount}</span>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            background: '#EFF6FF',
            color: '#1E3A8A',
            fontSize: 16,
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          📊 Histórico: {totalSimulados} simulados | Melhor nota: {melhorNota}% |
          Última nota: {ultimaNota}%
        </div>
        {!started && (
  <div
    style={{
      marginTop: 32,
      padding: 24,
      borderRadius: 24,
      background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
      color: 'white',
      textAlign: 'center',
    }}
  >
    <h2
      style={{
        fontSize: 'clamp(26px, 7vw, 36px)',
        marginBottom: 12,
      }}
    >
      Comece seu simulado JLPT N4
    </h2>

    <p
      style={{
        fontSize: 'clamp(16px, 4.5vw, 19px)',
        lineHeight: 1.6,
        marginBottom: 20,
      }}
    >
      Treine japonês com perguntas estilo JLPT N4, explicação em português e
      resultado no final.
    </p>

    <div
      style={{
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 18,
        padding: 18,
        textAlign: 'left',
        marginBottom: 24,
        lineHeight: 1.8,
        fontSize: 'clamp(15px, 4vw, 17px)',
      }}
    >
      <div>✅ 10 perguntas por simulado</div>
      <div>✅ Tradução, vocabulário e gramática</div>
      <div>✅ Resultado com aproveitamento</div>
      <div>✅ Indicação do ponto que precisa melhorar</div>
    </div>

    <button
      onClick={() => {
        setStarted(true)
        resetQuiz()
        setTimeout(() => {
          loadQuestion(selectedCategory, [])
        }, 200)
      }}
      style={{
        width: '100%',
        padding: 18,
        borderRadius: 18,
        border: 'none',
        background: '#22C55E',
        color: 'white',
        fontSize: 'clamp(18px, 5vw, 22px)',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
      }}
    >
      Começar simulado
    </button>

    <p
      style={{
        marginTop: 18,
        fontSize: 14,
        opacity: 0.9,
      }}
    >
      Ideal para brasileiros no Japão que querem passar no JLPT N4 🇯🇵
    </p>
  </div>
)}

        {started && finished && (
          <div
            style={{
              marginTop: 32,
              padding: 24,
              borderRadius: 20,
              background: '#f3f4f6',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 28, color: '#1E3A8A' }}>
              🎉 Simulado finalizado!
            </h2>

            <p style={{ fontSize: 20 }}>
              Você acertou {correctCount} de {totalQuestions} perguntas.
            </p>

            <p style={{ fontSize: 18 }}>Erros: {wrongCount}</p>

            <p
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#1E3A8A',
              }}
            >
              Aproveitamento:{' '}
              {Math.round((correctCount / totalQuestions) * 100)}%
            </p>
            <div
  style={{
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    background: getPerformanceLevel().background,
    color: getPerformanceLevel().color,
    textAlign: 'center',
    fontWeight: 'bold',
  }}
>
  <div style={{ fontSize: 32 }}>{getPerformanceLevel().emoji}</div>

  <h3 style={{ fontSize: 24, margin: '8px 0' }}>
    Seu nível atual: {getPerformanceLevel().title}
  </h3>

  <p
    style={{
      fontSize: 17,
      lineHeight: 1.6,
      margin: 0,
    }}
  >
    {getPerformanceLevel().message}
  </p>
</div>

<div
  style={{
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    textAlign: 'left',
  }}
>
  <h3
    style={{
      color: '#1E3A8A',
      fontSize: 22,
      marginTop: 0,
      marginBottom: 14,
      textAlign: 'center',
    }}
  >
    📘 Plano de estudo recomendado
  </h3>

  {getStudyPlan().map((item, index) => (
    <div
      key={index}
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: 12,
        fontSize: 16,
        lineHeight: 1.5,
        color: '#374151',
      }}
    >
      <strong>{index + 1}.</strong>
      <span>{item}</span>
    </div>
  ))}
</div>

            
            <div
              style={{
                marginTop: 24,
                padding: 18,
                borderRadius: 16,
                background: '#ffffff',
                textAlign: 'left',
              }}
            >
              <h3
                style={{
                  color: '#1E3A8A',
                  fontSize: 22,
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                Desempenho por categoria
              </h3>

              {Object.entries(categoryStats).map(([category, stats]: any) => {
                const total = stats.correct + stats.wrong
                const percent = Math.round((stats.correct / total) * 100)

                return (
                  <div
                    key={category}
                    style={{
                      marginBottom: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: '#f3f4f6',
                    }}
                  >
                    <strong>{getCategoryLabel(category)}</strong>

                    <div style={{ marginTop: 6 }}>
                      ✅ {stats.correct} acertos | ❌ {stats.wrong} erros |{' '}
                      {percent}%
                    </div>
                  </div>
                )
              })}
            </div>
         {Math.round((correctCount / totalQuestions) * 100) === 100 && (
  <div
    style={{
      marginTop: 20,
      padding: 18,
      borderRadius: 16,
      background: '#DCFCE7',
      color: '#166534',
      textAlign: 'center',
      fontSize: 18,
      fontWeight: 'bold',
    }}
  >
    🏆 Excelente!
    <br />
    Você acertou 100% do simulado.
    <br />
    Continue treinando para manter esse nível no JLPT N4.
  </div>
)}

{getWeakestCategory() &&
  Math.round((correctCount / totalQuestions) * 100) < 100 && (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        borderRadius: 16,
        background: '#FEF3C7',
        color: '#92400E',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
      }}
    >
      📌 Recomendação de estudo:
      <br />
      Você precisa melhorar mais em:{' '}
      {getCategoryLabel(getWeakestCategory()?.category)}
      <br />
      Aproveitamento nessa categoria: {getWeakestCategory()?.percent}%
    </div>
  )}

            <button
              onClick={() => {
                resetQuiz()
                setTimeout(() => {
                  loadQuestion(selectedCategory, [])
                }, 200)
              }}
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                border: 'none',
                background: '#1E3A8A',
                color: 'white',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              Fazer novo simulado
            </button>
          </div>
        )}

        {started && question && !finished && (
  <div style={{ marginTop: 32 }}>
    <div
      style={{
        background: '#1E3A8A',
        color: 'white',
        padding: '16px',
        borderRadius: 20,
        textAlign: 'center',
        wordBreak: 'break-word',
      }}
    >
      <p
        style={{
          display: 'inline-block',
          background: '#DBEAFE',
          color: '#1E3A8A',
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 'bold',
          marginBottom: 12,
        }}
      >
        Categoria: {getCategoryLabel(question.category || 'translation')}
      </p>

      <p style={{ margin: 0, fontSize: 16 }}>Traduza a frase:</p>

      <h2
        style={{
          fontSize: 'clamp(22px, 6vw, 30px)',
          marginTop: 12,
          lineHeight: 1.4,
        }}
      >
        {question.question_text}
      </h2>

      {feedback && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            background: feedback.includes('Correto') ? '#dcfce7' : '#fee2e2',
            color: feedback.includes('Correto') ? '#166534' : '#991b1b',
            fontSize: 'clamp(16px, 4.5vw, 19px)',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {feedback}
          <div style={{ marginTop: 8, fontSize: 'clamp(14px, 4vw, 16px)' }}>
            Tradução correta: {translation}
          </div>
        </div>
      )}
    </div>

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginTop: 20,
      }}
    >
      {answers.map((a, i) => (
        <button
          key={i}
          disabled={answered}
          onClick={() => handleAnswer(a)}
          style={{
            padding: '14px 14px',
            borderRadius: 16,
            border: '1px solid #d1d5db',
            cursor: answered ? 'not-allowed' : 'pointer',
            fontSize: 'clamp(16px, 4.5vw, 18px)',
            background: '#ffffff',
            color: '#111827',
            WebkitTextFillColor: '#111827',
            textAlign: 'left',
            opacity: answered ? 0.75 : 1,
            pointerEvents: answered ? 'none' : 'auto',
            lineHeight: 1.4,
            width: '100%',
            minHeight: 52,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          {String.fromCharCode(65 + i)}. {a.answer_text}
        </button>
      ))}
    </div>
  </div>
)}
      </div>
    </main>
  )
}