function init() {
    // here are some variables we will use later
    var stats = initStats();
    var myHealth = 100;
    var myScore = 0;
    var clock = new THREE.Clock();
    var alive = true;
    var damage = 20;
    var enemies = [];
    var bullets = [];
    var mouseCoor = { x: 0, y: 0 };
    var projector = new THREE.Projector();
    var gui = new dat.GUI();
    var scene = new THREE.Scene();
    var coverWall1, coverWall2, coverWall3, coverWall4, coverWall5, coverWall6;
    var sceneCube, cameraCube, textureCube, saveArea, text, uniforms;
    
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.y = 35;
    scene.add(camera);
    
    // here's the FirstPersonControl I used for this project, in order to delete the movement of moving forward and backward
    // when clicking the mouse, I modified some parts in the FirstPersonControl.js file attached
    var camControls = new THREE.FirstPersonControls(camera);
    camControls.movementSpeed = 150;
    camControls.lookSpeed = 0.1;
    camControls.noFly = true;
    camControls.lookVertical = false;
    
    // setup the scene...
    createGround();	
    createWalls();
    createSkybox();
    
    // adding lights
    var directionalLight1 = new THREE.DirectionalLight(0xF7EFBE, 0.7);
    directionalLight1.position.set(0.5, 1, 0.5);
    scene.add(directionalLight1);
    var directionalLight2 = new THREE.DirectionalLight(0xF7EFBE, 0.5);
    directionalLight2.position.set(-0.5 , -1, -0.5);
    scene.add(directionalLight2);		
    
    // adding 10 enemies
    for (var i = 0; i < 10; i++) {
        createEnemy();
    }
    
    var renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0xEEEEEE, 1.0));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMapEnabled = true;
    document.getElementById("WebGL-output").appendChild(renderer.domElement);
    document.body.appendChild(renderer.domElement);
    document.addEventListener("mousemove",mouseMoveListener,false);

    // here is the code I found on website which will determine when to shoot when catching the left mouse click event
    $(document).click(function(event) {
        event.preventDefault();
        if (event.which === 1) {
            shootBullets(camera);
        }
    });
    
    function mouseMoveListener(event) {
        event.preventDefault();
        mouseCoor.x = (event.clientX/window.innerWidth) * 2 - 1;
        mouseCoor.y = -(event.clientY/window.innerHeight) * 2 + 1;
    }
    
    // add the hud elements and help info, which contain hp and score
    $('body').append('<div id="hud"><p>Health: <span id="health">100</span><br />Score: <span id="score">0</span></p></div>');
    $('body').append('<div id="help"><p>Use WASD to move<br />Left click to shoot</p></div>');
    
    render();
    function render() {
        stats.update();
        text.rotation.y += 0.02;
        requestAnimationFrame(render);		
        var delta = clock.getDelta();
        var enemySpeed = delta*100;			
        camControls.update(delta);
        
        // check if the camera collides with walls
        if (checkCollision(camera.position)) {
            if (camControls.moveForward) {
                camControls.moveForward = false;
            } else if (camControls.moveBackward) {
                camControls.moveBackward = false;
            } else if (camControls.moveLeft) {
                camControls.moveLeft = false;
            } else if (camControls.moveRight) {
                camControls.moveRight = false;
            } else {
                var useless = 0;
            }
        }
        
        if (checkSaveArea(camera.position)) {
            $('body').append('<div id="saveMessage"><p>You are inside the save area!</p></div>');
            myHealth = 100;
            document.getElementById("health").innerHTML = myHealth;
        } else {
            $('#saveMessage').remove();
        }
        
        // first we go through the bullets list and create them in the scene, if the collide with walls then we delete them
        for (var i = bullets.length-1; i >= 0; i--) {
            var b = bullets[i];
            var p = b.position;
            var d = b.ray.direction;			
            if (checkCollision(p) || (checkSaveArea(p))) {
                bullets.splice(i,1);
                scene.remove(b);
            }
            
            // then we check if the current bullet hit the enemies or the user. If hit, we delete it too and subtract the health of characters
            var hit;
            for (var j = enemies.length-1; j >= 0; j--) {
                hit = false;
                var a = enemies[j];      
                var c = a.position;			
                if ((p.x < c.x + 15) && (p.x > c.x - 15) && (p.z < c.z + 15) && (p.z > c.z - 15) && (b.from != a)) {
                    bullets.splice(i, 1);
                    scene.remove(b);
                    a.health -= damage;
                    a.timesHit += 1;
                    hit = true;
                }
                if (hit) {
                    changeMaterial(a);
                }
            }				
            
            // if player got hit, change the health and delete the bullet, and update the health in hud
            if (b.from != camera && Math.sqrt((camera.position.x - p.x) * (camera.position.x - p.x) + (camera.position.z - p.z) * (camera.position.z - p.z)) < 25) {
                myHealth -= 5;
                bullets.splice(i, 1);
                scene.remove(b);
                document.getElementById("health").innerHTML = myHealth;
            }
            
            // if the bullet hits nothing, it keeps moving forward				
            if (!hit) {
                var bulletSpeed = 20;
                b.translateX(bulletSpeed * d.x);
                b.translateZ(bulletSpeed * d.z);
            }	
        }
        
        // then we go through the enemies list to check conditions for each enemy
        for (var i = enemies.length-1; i >= 0; i--) {
            var a = enemies[i];
            a.updateAnimation(delta * 1000);
            
            // we take out the enemy if its health is below 0, and update the score in hud
            if (a.health <= 0) {
                myScore += 10;
                a.playAnimation('deatha', 10);
                a.updateAnimation(delta * 1000);
                enemies.splice(i,1);
                scene.remove(a);
                document.getElementById("score").innerHTML = myScore;
                createEnemy();
            }
            
            // then we move the enemy randomly using Math.random()
            var r = Math.random();
            if (r > 0.998) {
                a.randomMoveX = Math.random() * 2 - 1;
                a.randomMoveZ = Math.random() * 2 - 1;
            }
            a.translateX(enemySpeed * a.randomMoveX);
            a.translateZ(enemySpeed * a.randomMoveZ);
            
            // then we check if they hit the wall, if so then they will move in other directions
            // I will modify the conditions in if statement later
            var c = getCoordinate(a.position);
            if ((c.x < -1248)||(c.x >= 1248)||(c.z < -1248)||(c.z >= 1248)||checkCollision(a.position)||(checkSaveArea(a.position))) {
                a.translateX(-2 * enemySpeed * a.randomMoveX);
                a.translateZ(-2 * enemySpeed * a.randomMoveZ);
                a.randomMoveX = Math.random() * 2 - 1;
                a.randomMoveZ = Math.random() * 2 - 1;
            }
            // if the user is in the range of enemy or the enemy hasn't shoot for some time, it will shoot the user
            if (a.previousShotTime + 1000 < Date.now() && Math.sqrt((camera.position.x-a.position.x)*(camera.position.x-a.position.x)+(camera.position.z-a.position.z)*(camera.position.z-a.position.z)) < 300) {
                a.playAnimation('crattack', 10);				
                shootBullets(a);
                a.previousShotTime = Date.now();
            } else {
                a.playAnimation('run', 10);
            }
            a.updateAnimation(delta * 1000);
        }
        // if user's health is below 0, game over
        if (myHealth <= 0) {
            myHealth = 0;
            $('body').append('<div id="deadMessage"><p>Game Over<br />Refresh to restart<br />Your score: <span id="highscore"></span></p></div>');
            document.getElementById("highscore").innerHTML = myScore;
            document.getElementById("health").innerHTML = myHealth;
            alive = false;
        }
        if (alive) {
            renderer.autoClear = false;
            renderer.render(sceneCube, cameraCube);
            renderer.render(scene,camera);
        }
    }
    
    // create the skybox of the scene
    // the required skybox and mirrored surface are all inside here
    function createSkybox() {
        var urls = [
            '../assets/Images/skybox2.png', '../assets/Images/skybox4.png',
            '../assets/Images/skybox5.png', '../assets/Images/skybox6.png',
            '../assets/Images/skybox1.png', '../assets/Images/skybox3.png'
        ];
        textureCube = THREE.ImageUtils.loadTextureCube(urls);
        sceneCube = new THREE.Scene();
        cameraCube = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);

        var shader = THREE.ShaderLib["cube"];
        shader.uniforms["tCube"].value = textureCube;
        var material = new THREE.ShaderMaterial({
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: shader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        });
                
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000), material);
        sceneCube.add(mesh);
        
        // this is an spherical area where player can hide in it and gain some health point, and bullets cannot pass the sphere
        var reflectionMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, envMap: textureCube });
        saveArea = new THREE.Mesh(new THREE.SphereGeometry(200,50,50), reflectionMaterial);
        saveArea.position.x = -150;
        saveArea.position.z = -600;
        
        scene.add(saveArea);
        
        var settings = {
            size: 30,
            height: 30,
            weight: "normal",
            font: "helvetiker",
            bevelThickness: 2,
            bevelSize: 0.5,
            bevelSegments: 3,
            bevelEnabled: true,
            curveSegments: 12,
            steps: 1
        };

        var meshMaterial = new THREE.MeshPhongMaterial({
            specular: 0xffffff,
            color: 0xeeffff,
            shininess: 100,
            metal: true
        });
        
        text = new THREE.Mesh(new THREE.TextGeometry("Get In HERE!!", settings), meshMaterial);
        text.position.x = -150;
        text.position.z = -600;
        text.position.y = 210;
        scene.add(text);
    }
    
    // add the ground
    function createGround() {
        var groundGeometry = new THREE.BoxGeometry(2500, 10, 2500);
        var groundMaterial = new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture('../assets/Images/ground.jpg')});
        var ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.receiveShadow = true;
        scene.add(ground);
    }
    
    // this function will add walls into the scene 
    function createWalls() {
        var sideWallPlane = new THREE.PlaneGeometry(2500,80,1,1);
        var backWallPlane = new THREE.PlaneGeometry(2500,80,1,1);
        var wallMaterial = new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture('../assets/Images/wall.jpg'), side: THREE.DoubleSide});
        var backWall = new THREE.Mesh(backWallPlane, wallMaterial);
        var sideWallL = new THREE.Mesh(sideWallPlane, wallMaterial);
        var sideWallR = new THREE.Mesh(sideWallPlane, wallMaterial);
        var frontWall = new THREE.Mesh(backWallPlane, wallMaterial);
        
        backWall.position.x = 1250;
        backWall.position.y = 40;
        backWall.rotation.y = 0.5*Math.PI;
        backWall.receiveShadow = true;
        
        sideWallL.position.y = 40;
        sideWallL.position.z = -1250;
        sideWallL.receiveShadow = true;
        
        sideWallR.position.y = 40;
        sideWallR.position.z = 1250;
        sideWallR.receiveShadow = true;
        
        frontWall.position.x = -1250;
        frontWall.position.y = 40;
        frontWall.rotation.y = 0.5*Math.PI;
        frontWall.receiveShadow = true;
        
        var coverWallCube = new THREE.BoxGeometry(500,120,250);
        var wallMaterial2 = new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture('../assets/Images/wall2.jpg'), side:THREE.DoubleSide});
        var wallMaterial3 = new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture('../assets/Images/wall3.png'), side:THREE.DoubleSide});
        var wallMaterial4 = new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture('../assets/Images/wall4.jpg'), side:THREE.DoubleSide});
        coverWall1 = new THREE.Mesh(coverWallCube, wallMaterial2);
        coverWall2 = new THREE.Mesh(coverWallCube, wallMaterial3);
        coverWall3 = new THREE.Mesh(coverWallCube, wallMaterial4);
        
        coverWall1.position.y = 40;
        coverWall1.position.x = 800;
        coverWall1.rotation.y = 0.5*Math.PI;
        coverWall1.receiveShadow = true;
        
        coverWall2.position.y = 40;
        coverWall2.position.x = -450;
        coverWall2.receiveShadow = true;
        
        coverWall3.position.y = 40;
        coverWall3.position.z = 800;
        coverWall3.receiveShadow = true;
        
        var coverWallCube2 = new THREE.BoxGeometry(250,100,20);
        coverWall4 = new THREE.Mesh(coverWallCube2, wallMaterial2);
        coverWall5 = new THREE.Mesh(coverWallCube2, wallMaterial);
        coverWall6 = new THREE.Mesh(coverWallCube2, wallMaterial4);
        
        coverWall4.position.y = 40;
        coverWall4.position.x = -900;
        coverWall4.position.z = -550;
        coverWall4.rotation.y = 0.5*Math.PI;
        coverWall4.receiveShadow = true;
        
        coverWall5.position.y = 40;
        coverWall5.position.x = 858;
        coverWall5.position.z = -750;
        coverWall5.receiveShadow = true;
        
        coverWall6.position.y = 40;
        coverWall6.position.x = 700;
        coverWall6.position.z = 850;
        coverWall6.rotation.y = 0.5*Math.PI;
        coverWall6.receiveShadow = true;
        
        scene.add(backWall);
        scene.add(frontWall);
        scene.add(sideWallL);
        scene.add(sideWallR);
        scene.add(coverWall1);
        scene.add(coverWall2);
        scene.add(coverWall3);
        scene.add(coverWall4);
        scene.add(coverWall5);
        scene.add(coverWall6);
    }
    
    // this function create enemy object and add it into the scene, their position will be decided randomly
    function createEnemy() {
        var coor = getCoordinate(camera.position);
        var enemy;			
        var loader = new THREE.JSONLoader();
        loader.load('../assets/Models/ogro.js', function(geometry, mat) {
            geometry.computeMorphNormals();
            var mat = new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture("../assets/Images/skin.jpg"), morphTargets: true, morphNormals: true});
            var xCoor = randomIntFromInterval(-1250,1250);
            var zCoor = randomIntFromInterval(-1250,1250);		
            enemy = new THREE.MorphAnimMesh(geometry, mat);
            enemy.parseAnimations();
            enemy.playAnimation('run', 10);
            enemy.position.set(xCoor, 25, zCoor);
            enemy.health = 100;
            enemy.timesHit = 0;
            enemy.randomMoveX = Math.random();
            enemy.randomMoveZ = Math.random();
            enemy.previousShotTime = Date.now();
            enemies.push(enemy);
            scene.add(enemy);
        });	
    }
    
    // this function will change the material to a shaderMaterial based on the enemy's health when the enemy object it hit
    function changeMaterial(obj) {
        var skinImage = THREE.ImageUtils.loadTexture('../assets/Images/skin.jpg');
        var bloodImage = THREE.ImageUtils.loadTexture('../assets/Images/blood.jpg');
        if (obj.timesHit == 1) {
            uniforms = {
                tex: {type : "t", value: skinImage},
                tex2: {type : "t", value: bloodImage},
                texLevel:{type:"f", min: 0.0, max: 1.0, value: 0.8},
                texLevel2:{type:"f", min: 0.0, max: 1.0, value: 0.2},
            };
        } else if (obj.timesHit == 2) {
            uniforms = {
                tex: {type : "t", value: skinImage},
                tex2: {type : "t", value: bloodImage},
                texLevel:{type:"f", min: 0.0, max: 1.0, value: 0.6},
                texLevel2:{type:"f", min: 0.0, max: 1.0, value: 0.4},
            };
        } else if (obj.timesHit == 3) {
            uniforms = {
                tex: {type : "t", value: skinImage},
                tex2: {type : "t", value: bloodImage},
                texLevel:{type:"f", min: 0.0, max: 1.0, value: 0.4},
                texLevel2:{type:"f", min: 0.0, max: 1.0, value: 0.6},
            };
        } else if (obj.timesHit == 4) {
            uniforms = {
                tex: {type : "t", value: skinImage},
                tex2: {type : "t", value: bloodImage},
                texLevel:{type:"f", min: 0.0, max: 1.0, value: 0.2},
                texLevel2:{type:"f", min: 0.0, max: 1.0, value: 0.8},
            };
        } else {
            uniforms = {
                tex: {type : "t", value: skinImage},
                tex2: {type : "t", value: bloodImage},
                texLevel:{type:"f", min: 0.0, max: 1.0, value: 0.0},
                texLevel2:{type:"f", min: 0.0, max: 1.0, value: 1.0},
            };
        }
        
        var vertexShader = document.getElementById('vertexShader').text;
        var fragmentShader = document.getElementById('fragmentShader').text;
        var newMaterial = new THREE.ShaderMaterial({ 
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,    
        });
        obj.material = newMaterial;
    }
    
    // this is the function to generate random number within a range, which is used in createEnemy()
    function randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    // this function create bullet from the object who fires
    function shootBullets(obj) {
        var bulletGeometry = new THREE.SphereGeometry(6,6,6);
        var bulletMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('../assets/Images/fireball.jpg')});
        var bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.set(obj.position.x, obj.position.y, obj.position.z);
        if (obj == camera) {
            // the code below will set the direction of the bullet and make it move in that direction
            var directionVector = new THREE.Vector3(mouseCoor.x,mouseCoor.y,1);
            directionVector.unproject(obj);
            bullet.ray = new THREE.Ray(obj.position,directionVector.sub(obj.position).normalize());
        } else {
            var directionVector = camera.position.clone();
            bullet.ray = new THREE.Ray(obj.position,directionVector.sub(obj.position).normalize());
        }
        bullet.from = obj;
        bullets.push(bullet);
        scene.add(bullet);
        return bullet;
    }
    
    // this is the function to check if the object collide with walls.
    function checkCollision(obj) {
        var v = getCoordinate(obj);
        if ((v.x>1248)||(v.x<-1248)||(v.z>1248)||(v.z<-1248)) {
            return true;
        } else if ((v.x>coverWall1.position.x-125&&v.x<coverWall1.position.x+125)&&(v.z<coverWall1.position.z+250&&v.z>coverWall1.position.z-250)) {
            return true;
        } else if ((v.x>coverWall2.position.x-250&&v.x<coverWall2.position.x+250)&&(v.z<coverWall2.position.z+125&&v.z>coverWall2.position.z-125)) {
            return true;
        } else if ((v.x>coverWall3.position.x-250&&v.x<coverWall3.position.x+250)&&(v.z<coverWall3.position.z+125&&v.z>coverWall3.position.z-125)) {
            return true;
        } else if ((v.x>coverWall4.position.x-10&&v.x<coverWall4.position.x+10)&&(v.z<coverWall4.position.z+125&&v.z>coverWall4.position.z-125)) {
            return true;
        } else if ((v.x>coverWall5.position.x-125&&v.x<coverWall5.position.x+125)&&(v.z<coverWall5.position.z+10&&v.z>coverWall5.position.z-10)) {
            return true;
        } else if ((v.x>coverWall6.position.x-10&&v.x<coverWall6.position.x+10)&&(v.z<coverWall6.position.z+125&&v.z>coverWall6.position.z-125)) {
            return true;
        } else {
            return false;
        }
    }
    
    // check if something hit with the save area
    function checkSaveArea(obj) {
        var v = getCoordinate(obj);
        if ((v.x > saveArea.position.x - 170 && v.x < saveArea.position.x + 170) &&
            (v.z < saveArea.position.z + 170 && v.z > saveArea.position.z - 170)) {
            return true;
        }
    }
    
    // this function simply returns the x,z coordinate of an object
    function getCoordinate(obj) {
        var x = obj.x;
        var z = obj.z;
        return {x: x, z: z};
    }
    
    function initStats() {
        var stats = new Stats();
        stats.setMode(0); 		
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.getElementById("Stats-output").appendChild(stats.domElement);
        return stats;
    }		       
}
window.onload = init;