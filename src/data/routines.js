export const HOME_ROUTINES = [
    {
        id: 'full-body-1',
        title: 'Full Body Express',
        description: 'Rutina completa de cuerpo entero para quemar grasa y tonificar.',
        duration: 25,
        level: 'Principiante',
        calories: 200,
        image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
        exercises: [
            { name: 'Sentadillas (Squats)', sets: 3, reps: 15, rest: 45 },
            { name: 'Flexiones (Push-ups)', sets: 3, reps: 10, rest: 45 },
            { name: 'Estocadas (Lunges)', sets: 3, reps: 12, rest: 45 },
            { name: 'Plancha (Plank)', sets: 3, duration: 30, type: 'time', rest: 60 },
            { name: 'Jumping Jacks', sets: 3, duration: 45, type: 'time', rest: 60 }
        ]
    },
    {
        id: 'core-blast',
        title: 'Core de Acero',
        description: 'Enfocado 100% en abdominales y fuerza central.',
        duration: 15,
        level: 'Intermedio',
        calories: 120,
        image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        exercises: [
            { name: 'Crunches', sets: 4, reps: 20, rest: 30 },
            { name: 'Elevación de Piernas', sets: 4, reps: 15, rest: 30 },
            { name: 'Russian Twists', sets: 4, reps: 20, rest: 30 },
            { name: 'Plancha Lateral', sets: 2, duration: 30, type: 'time', rest: 45 }
        ]
    },
    {
        id: 'hiit-cardio',
        title: 'HIIT Quema Grasa',
        description: 'Alta intensidad para acelerar el metabolismo al máximo.',
        duration: 20,
        level: 'Avanzado',
        calories: 250,
        image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80',
        exercises: [
            { name: 'Burpees', sets: 4, duration: 30, type: 'time', rest: 30 },
            { name: 'Mountain Climbers', sets: 4, duration: 30, type: 'time', rest: 30 },
            { name: 'High Knees', sets: 4, duration: 30, type: 'time', rest: 30 },
            { name: 'Jump Squats', sets: 4, duration: 30, type: 'time', rest: 60 }
        ]
    },
    {
        id: 'ciclismo-cardio',
        title: 'Ciclismo / Rodada & Resistencia',
        description: 'Pedaleo continuo, resistencia cardiovascular y cadencia.',
        duration: 45,
        level: 'Intermedio',
        calories: 420,
        image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
        exercises: [
            { name: 'Calentamiento y cadencia suave', sets: 1, duration: 300, type: 'time', rest: 0 },
            { name: 'Ritmo constante zona 2-3', sets: 1, duration: 1800, type: 'time', rest: 60 },
            { name: 'Sprints / Pendientes en bici', sets: 5, duration: 60, type: 'time', rest: 60 },
            { name: 'Enfriamiento y pedaleo suave', sets: 1, duration: 300, type: 'time', rest: 0 }
        ]
    },
    {
        id: 'futbol-match',
        title: 'Fútbol / Partido & Físico',
        description: 'Partido de fútbol 5/7/11 con sprints y resistencia mixta.',
        duration: 60,
        level: 'Avanzado',
        calories: 550,
        image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
        exercises: [
            { name: 'Calentamiento dinámico y movilidad', sets: 1, duration: 300, type: 'time', rest: 0 },
            { name: 'Primer tiempo (Juego continuo y sprints)', sets: 1, duration: 1500, type: 'time', rest: 300 },
            { name: 'Segundo tiempo (Resistencia y cambios de ritmo)', sets: 1, duration: 1500, type: 'time', rest: 0 }
        ]
    }
];
