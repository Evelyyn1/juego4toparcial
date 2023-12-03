//Definir animaciones: caminar, saltar
//frames, velocidad de frame,
Q.animations("animacionesMario", {
	//caminar
	caminar : {
		frames : [4, 5, 8],
		//animacion de 6 frames por segundo
		rate : 1 / 6,
		loop : false
	},
	saltar : {
		frames : [2],
		rate : 1 / 2,
		loop : false
	},
	quieto : {
		frames : [1],
		rate : 1 / 2,
		loop : false
	},
	muere : {
		frames : [12],
		rate : 1 / 2,
		loop : false,
		trigger : "casiMuerto"
	}
});

Q.animations("animacionesMarioGrande", {
	caminar : {
		frames : [1, 2, 3],
		rate : 1 / 6,
		loop : false
	},
	saltar : {
		frames : [4],
		rate : 1 / 2
	},
	quieto : {
		frames : [0],
		rate : 1 / 2,
		loop : false
	}
});

//D57
//Definimos la clase Jugador que se extiende la clase Sprite
//Sprite pertenece al core de Quintu
//nombre de la clase y objeto de configuración de la clase

Q.Sprite.extend("Jugador", {
	init : function(p) {
		this._super(p, {
			sprite : "animacionesMario",
			sheet : "jugador",
			frame : 1,
			jumpSpeed : -600,
			speed : 200,
			//DECLARAMOS NUESTRAS PROPIEDADES
			estaVivo : true,
			z : 1,
			//obtenemos la altura del escenario, mas adelante la usamos
			//para calcular si el mario se cayo del escenario
			alturaEscenario : Q("TileLayer").first().p.h,
			sheetGrande : "jugadorGrande",
			animacionesGrande : "animacionesMarioGrande",
			esEnano : true, //bandera que indica si mario es enano o grande
			invencible : false,//esta propiedad es para cuando mario come un hongo o se hace enano
			saltoEnano : "salto_enano.mp3",
			saltoGrande : "salto_grande.mp3"
		});
		this.add("2d, platformerControls, animation, tween");
		
		this.p.cancionSaltar = this.p.saltoEnano;

		this.on("hit", function(colision) {
			//si mario comio un hongo para crecer
			if (colision.obj.isA("HongoCrece")) {
				//hacemos que crezca
				this.crecer();
			}
		});

		//escucho cuando colisiono por abajo con la tuberia de entrada
		this.on("bump.bottom", function(colision) {
			//revisar si colsione con una TuberiaEntrada y su pulse flecha abajo
			if (colision.obj.isA("Tuberia") && Q.inputs["down"]) {
				//llamar a la escena del subterranea
				Q.audio.stop("tema_superficie.mp3");
				this.p.sensor = true;
				this.del("2d");
				//UNA VEZ QUE INSERTAMOS AL HONGO, HACEMOS UNA ANIMACION TWEEN
				Q.audio.play("tuberia.mp3");
				this.animate({
					//anima a mario en la cordenada y de la tuberia
					y : this.p.y + 30
				}, 0.5, {
					//ejecutamos esta funcion una vez que el hongo salio por completo
					//de su caja
					callback : function() {
						//regresamos al hongo el modulo 2d para detectar colisones
						//deshabilitamos la propiedad sensor
						this.p.sensor = false;
						this.add("2d");
						Q.stageScene("mundo1Subterraneo", 2, {
							//sort = HABILITA EL ORDENAMIENTO CON LA PROPIEDAD Z
							sort : true
						});
					}
				});
			}
		});

		//escuchar colision por la derecha con la tuberia de salida
		this.on("bump.right", function(colision) {

			if (colision.obj.isA("TuberiaSalida") && Q.inputs["right"]) {
				//detiene el audio del mundo subterraneo
				Q.audio.stop("subterraneo.mp3");
				Q.audio.play("tuberia.mp3");
				this.p.sensor = true;
				this.del("2d");
				this.animate({
					//anima a mario en la cordenada y de la tuberia
					x : this.p.x + 30
				}, 0.5, {
					//ejecutamos esta funcion una vez que el hongo salio por completo
					//de su caja
					callback : function() {
						//darle stop al mundo subterraneo
						this.stage.stop();
						//activar la escena previa (mundo1)
						this.p.escena_previa.start();

						//el atributo stage de mario debe ser el mundo1
						//this.stage = this.p.escena_previa;

						Q.stageScene("mundo1", {
							propiedadesMario : this.p
						});

						//destruimos este mario y su escena
						this.stage.destroy();
					}
				});
			}
		});

		//-- ESCUCHAMOS EL EVENTO casiMuerto, que detona el trigger
		// de la animacion morir
		this.on("casiMuerto", this, function() {

			//DESHABILITAMOS LA GRAVEDAD PARA ESTE SPRITE
			this.p.sensor = true;
			this.del("2d");

			//EJECTUAMOS ANIMACION TWEEN

			this.animate({
				//mueve el sprite a la posicion y indicada
				y : this.p.y - 100
			}, 0.5, {
				//esta funcion se ejecuta cuando ya haya
				//terminado la animacion tween que lleva al mario
				//hacia arriba
				callback : function() {

					//EJECUTAMOS OTRA ANIMACION TWEEN
					//PARA SACAR A MARIO DEL ESCENARIO
					this.animate({
						//obtenemos la altura del juego(escenario)
						//y animamos a  mario para que se vaya hasta el fondo
						y : Q("TileLayer").first().p.h
					}, 0.5, {
						//se ejecuta cuando ya terminamos de sacar a mario
						//del escenario
						callback : function() {

							//DESTRUIMOS AL JUGADOR
							this.destroy();
						}
					});

				}
			});

		});

		//escuchamos si al mario le pegan por los costados
		//o por la cabeza
		this.on("bump.left, bump.right, bump.top", function(colision) {
			//esta funcion se ejecuta cuando se produce la colision

			//si mario no es invencible Y
			//si el objeto con el que choco mario es un enemigo
			//y si ese enemigo no es una tortuga en forma de concha, entonces ...
			if (this.p.invencible === false && colision.obj.p.enemigo === true && colision.obj.p.esConcha !== true) {

				//SI MARIO ES ENANO debe morir!!
				if (this.p.esEnano) {
					this.morir();
				} else {
					//si es grande hacemos que se vuelva enano
					this.decrecer();					
				}
			} else if (this.p.invencible === false && colision.obj.p.esConcha === true && colision.obj.p.vx !== 0) {
				//si es una concha Y LLEVA VELOCIDAD ...
								
				//SI MARIO ES ENANO debe morir!!
				if (this.p.esEnano) {
					this.morir();
				} else {
					//si es grande hacemos que se vuelva enano
					this.decrecer();					
				}
			}
		});

	},
	//funcion auxiliar que hace decrecer a mario
	decrecer : function() {
		this.p.opacity = 0.5;		
		//temporalmente hacemos al mario grande 50% de su tam original
		//hacemos al jugador temporalmente invencible
		this.p.invencible = true;
		this.p.sensor = true;
		this.p.cancionSaltar = this.p.saltoEnano;
		
		Q.audio.play("mario_decrece.mp3");

		this.animate({
			scale : 0.5,
			opacity : 1
		}, 0.5, {
			callback : function() {
				this.p.sensor = false;
				this.p.esEnano = true;
				//terminada la animacion del mario hacemos que ya no sea invencible
				this.p.invencible = false;
				//cambiamos las animaciones por su original				
				this.p.sprite = "animacionesMario";
				this.sheet("jugador", true);
				this.p.scale = 1;

			}
		});
	},
	//funcion auxiliar que hace crecer a mario
	crecer : function() {
		this.p.sprite = this.p.animacionesGrande;
		this.p.opacity = 0.5;
		this.p.scale = 0.5;
		this.p.esEnano = false;
		//temporalmente hacemos al mario grande 50% de su tam original
		//hacemos al jugador temporalmente invencible
		this.p.invencible = true;
		this.sheet(this.p.sheetGrande, true);
		this.p.sensor = true;
		
		this.p.cancionSaltar = this.p.saltoGrande;
		
		//Q.audio.play("mario_crece.mp3");		

		this.animate({
			scale : 1,
			opacity : 1
		}, 0.5, {
			callback : function() {
				this.p.sensor = false;
				//terminada la animacion del mario hacemos que ya no sea invencible
				this.p.invencible = false;
			}
		});
	},
	//funcion que detona la muerte de mario
	//el parametro animar determina si al morir mario debe de ejecutar la animacion que lo saca del escenario
	morir : function(animar) {

		//si la variable animar no tiene nada, le ponemos true por default
		var animar = ( typeof animar === "undefined") ? true : animar;

		//deshabilita los controles de este jugador
		this.p.ignoreControls = true;

		//indicamos que mario ya esta muerto
		this.p.estaVivo = false;

		//---- QUE TENDRIAN QUE CAMBIAR PARA QUE SOLO
		//CON UNA FUNCION AUXILIAR Y USANDO UN BLOQUE forEach?
		//--- DESHABILITEN A TODOS LOS ENEMIGOS-----

		//DETENEMOS A TODOS LOS ENEMIGOS
		//este metodo esta definido en el archivo inicializar.js
		Q.pausarSprites();
		//pausamos el timer del juego
		Q.pausado = true;

		//si se nos pide animar a mario antes de morir
		if (animar === true) {
			//ejecutamos la animacion de que muere
			this.play("muere");
		} else {
			//si no se nos pide animar al mario simplemente lo destruimos
			this.destroy();
		}

		//DETENEMOS TODOS LOS AUDIOS DEL JUEGO
		Q.audio.stop();
		Q.audio.play("mario_muere.mp3");

	},
	//esta funcion se repite continuamente (Game Loop)
	step : function() {

		//si mario esta vivo
		if (this.p.estaVivo === true) {

			//Si el jugador va a la izquierda y tecleo derecha
			if (this.p.direction === "left" && Q.inputs["right"]) {
				this.p.flip = false;
			}
			//si el jugador va a la derecha y tecleo izquierda
			if (this.p.direction == "right" && Q.inputs["left"]) {
				this.p.flip = "x";
			}
			//ejecutar animacion de caminar
			if (this.p.vx != 0) {
				this.play("caminar");
			}
			//ejecutar la animacion saltar
			if (this.p.vy < 0) {
				Q.audio.play(this.p.cancionSaltar, {
					debounce : 1000
				});
				this.play("saltar");
			}
			//ejecutar animacion quieto
			if (this.p.vy === 0 && this.p.vx === 0) {
				this.play("quieto");
			}

			if (this.p.y > this.p.alturaEscenario) {
				//mata al mario sin la animacion
				this.morir(false);
			}
		}

	}
});
