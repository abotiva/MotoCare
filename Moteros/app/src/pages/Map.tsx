import { useState } from 'react'
import { 
  MapPin, Navigation, Layers, Locate, Plus, Minus, 
  Route, Clock, Flag, X, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const nearbyRoutes = [
  { id: 1, name: 'Ruta a Zipaquirá', distance: '45 km', time: '1h 15m', type: 'asfalto' },
  { id: 2, name: 'Alto de Patios', distance: '23 km', time: '45m', type: 'mixto' },
  { id: 3, name: 'La Calera Loop', distance: '67 km', time: '2h', type: 'asfalto' },
]

const savedRoutes = [
  { id: 1, name: 'Ruta del Desayuno', distance: '85 km', lastUsed: 'Hace 3 días' },
  { id: 2, name: 'Vía a Medellín', distance: '420 km', lastUsed: 'Hace 2 semanas' },
]

export function Map() {
  const [isNavigating, setIsNavigating] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null)
  const [showRoutePanel, setShowRoutePanel] = useState(false)

  return (
    <div className="h-[calc(100vh-4rem)] relative">
      {/* Map Container */}
      <div className="absolute inset-0 bg-moto-gray">
        <div className="w-full h-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-moto-darker via-moto-gray to-moto-darker">
            <svg className="w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
              <line x1="0" y1="30" x2="100" y2="30" stroke="white" strokeWidth="1" />
              <line x1="0" y1="70" x2="100" y2="70" stroke="white" strokeWidth="1" />
              <line x1="30" y1="0" x2="30" y2="100" stroke="white" strokeWidth="1" />
              <line x1="70" y1="0" x2="70" y2="100" stroke="white" strokeWidth="1" />
              <path 
                d="M 20 80 Q 40 60, 50 50 T 80 20" 
                fill="none" 
                stroke="#A6CE39" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="5,5"
              />
            </svg>
          </div>

          <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-8 h-8 bg-moto-orange rounded-full flex items-center justify-center shadow-lg shadow-moto-orange/50 animate-pulse">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-moto-orange" />
            </div>
          </div>

          <div className="absolute top-1/2 right-1/4">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Navigation className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="absolute bottom-1/3 left-1/2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Flag className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <Card className="bg-moto-dark/90 backdrop-blur-xl border-white/10 w-full max-w-md">
          <CardContent className="p-3 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-moto-orange" />
            <input 
              type="text" 
              placeholder="¿A dónde quieres ir?"
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-gray-500"
            />
            <Button size="sm" className="bg-moto-orange hover:bg-moto-orange-dark">
              <Navigation className="w-4 h-4 mr-1" />
              Ir
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="secondary" size="icon" className="bg-moto-dark/90 backdrop-blur-xl border-white/10">
            <Layers className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="icon" className="bg-moto-dark/90 backdrop-blur-xl border-white/10">
            <Locate className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-10">
        <Button variant="secondary" size="icon" className="bg-moto-dark/90 backdrop-blur-xl border-white/10">
          <Plus className="w-5 h-5" />
        </Button>
        <Button variant="secondary" size="icon" className="bg-moto-dark/90 backdrop-blur-xl border-white/10">
          <Minus className="w-5 h-5" />
        </Button>
      </div>

      {/* Bottom Panel */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        {!showRoutePanel ? (
          <Card className="bg-moto-dark/95 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Rutas Cercanas</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowRoutePanel(true)}>
                  Ver todas
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {nearbyRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRoute(route.id)}
                    className={`flex-shrink-0 p-3 rounded-xl border transition-all ${
                      selectedRoute === route.id
                        ? 'bg-moto-orange/20 border-moto-orange'
                        : 'bg-moto-gray/50 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <p className="font-medium text-sm">{route.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Route className="w-3 h-3" />
                        {route.distance}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {route.time}
                      </span>
                    </div>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {route.type}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-moto-dark/95 backdrop-blur-xl border-white/10 max-h-96 overflow-y-auto">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Tus Rutas</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowRoutePanel(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm text-gray-500 mb-2">Guardadas</h4>
                  {savedRoutes.map((route) => (
                    <div key={route.id} className="flex items-center justify-between p-3 bg-moto-gray/50 rounded-xl mb-2">
                      <div>
                        <p className="font-medium">{route.name}</p>
                        <p className="text-xs text-gray-400">{route.distance} · {route.lastUsed}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/10">
                          <Navigation className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm text-gray-500 mb-2">Rutas Sugeridas</h4>
                  {nearbyRoutes.map((route) => (
                    <div key={route.id} className="flex items-center justify-between p-3 bg-moto-gray/50 rounded-xl mb-2">
                      <div>
                        <p className="font-medium">{route.name}</p>
                        <p className="text-xs text-gray-400">{route.distance} · {route.time}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/10">
                          Guardar
                        </Button>
                        <Button size="sm" className="bg-moto-orange hover:bg-moto-orange-dark">
                          <Navigation className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Mode Overlay */}
      {isNavigating && (
        <div className="absolute top-20 left-4 right-4 z-20">
          <Card className="bg-moto-dark/95 backdrop-blur-xl border-moto-orange">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-moto-orange rounded-2xl flex items-center justify-center">
                    <Navigation className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">200 m</p>
                    <p className="text-gray-400">Gira a la derecha</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">45 min</p>
                  <p className="text-gray-400">23 km restantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Start Navigation Button */}
      {!isNavigating && selectedRoute && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10">
          <Button 
            size="lg" 
            className="bg-moto-orange hover:bg-moto-orange-dark shadow-lg shadow-moto-orange/30"
            onClick={() => setIsNavigating(true)}
          >
            <Navigation className="w-5 h-5 mr-2" />
            Iniciar Navegación
          </Button>
        </div>
      )}

      {/* Stop Navigation Button */}
      {isNavigating && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10">
          <Button 
            size="lg" 
            variant="destructive"
            onClick={() => setIsNavigating(false)}
          >
            <X className="w-5 h-5 mr-2" />
            Finalizar
          </Button>
        </div>
      )}
    </div>
  )
}
