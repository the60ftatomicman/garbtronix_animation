# Garbtronix Animation Library

My Personal ASCII animation tool
Able to build GIFS and MP4's straight from text.

![Ascii the world](./Docs/Imgs/Earth12Frame.gif)

<sup>Built from this very suite.</sup>

## Setup ##

- Install Python 3 latest
- Pip Install Dependancies
    - ```pip install Pillow```

    <sup>Does all of our GIF and IMG building</sup>
    - ```pip install numpy```
    - ```pip install opencv-python```
    
    <sup>Both of these are exclusively for MP4 generation</sup>
- create the file ```<root>/pythonGifBuilder/example.txt```
    - This is used for parsing our ascii art
- Run ```python3 <root>/pythonGifBuilder/main.py```
    - If it runs, great we've done it!

![The chair will not be present](./Docs/Imgs/MainWindow.png)

---

## How It Works ##

The application has 2 main important file standards with their own special markup language which get read.

- <b>PRE-COMPILED</b>
    - a program/markup language file which allows for object definition and scene composition.
    - This only produces output for the OTHER markup language.
- <b>POST-COMPILED</b>
    - A simple file which displays every frame that will be generated into an image

The standard workflow is as follows:

    - (Optional) Build a pre-compiled file and compile it
        - Good for complex scenes and stories
    - Generate a post-compile file
        - This is raw frames and for very small animations this is far easier!
    - Open pythonGifBuilder
    - Edit sizing, FPS, font, etc in pythonGifBuilder
    - Save and enjoy.

TL;DR -> Pre,Post,Build.

---

## How the Markup Files Work ##

#### Post Compiled File Standard ####

The format for these files is DEAD. SIMPLE. Let's take a look at a 2 frame animation:
```
0,1
*
  .--.
  | oo
  | >|
  `_-/
**
1,1
*
  .--.
  | oo
  | >|
  `_O/
**
```
Starting with line 1 we have a metadata line.
- 0,1
    - 0 : our drawing number. Honestly this can be any number its just for reference.
    - 1 : how many "frames" we want this drawing to last. Must be a number.
    - ex: 44,20 would mean we are on drawing 44 and we want it to last 20 frames.
- *
    - This is our beginning of drawing reference. Must be the only character on the line.
- The next part is our drawing.
- **
    - This is our end of drawing reference. Must be the only character on the line.
- We than clearly rinse repeat.

Here's the output of the example above

![Me talking](./Docs/Imgs/post-compiled-example.gif)

---

#### Pre Compiled File Standard ####
Let's use the same animation from above.
The format for these files is far more complex.
```
**** Objects
backdrop
*
** 0
      
      
      
      
*** E
head
*
** 0
.--.
| oo
| >|
`__/
*** E
mouth
*
** 0
-
** 1
O
*** E
#
#
#
**** Scene
* 1
** backdrop,0,0,0
** head,0,0,0
** mouth,0,3,3
*** E
```

Starting with line 1 we have a section delimiter
- **** Objects
    - the 4 dot lines are section delimiters.
    - There's only Objects and Scenes.
        - Objects == things we want to move
        - Scenes ==  compilations of objects
- backdrop
    - Name of an object
- *
    - The starting tag for an object
- ** 0
    - These are what I'd call object indexes
    - These delimit the different poses are drawings we want our object to be in
    - ORDERING MATTERS. START WITH 0, INCREMENT BY 1!
    - Unfortunetly our first object is just a blank bunch of space. Makes things prettier
- *** E
    - This is the end of an object. there will be no more indexes for this object
- Given what you read above for backdrop we can see in our Object section we have 3 objects
    - backdrop ( 1 index)
    - head (1 indexes)
    - mouth (2 indexes)
- Now we'll jump to the SCENES section
- **** Scenes
    - Start of our scenes section.
    - Scenes combine objects together into a single drawing
    - top to bottom index determines Z order. Closer to the bottom objects overwrite the top objects
- * 1
    - A start of scene divider. In this case we want it to last 1 frame
    - ex: * 34 would mean this scene will last 34 frames
- ** backdrop,0,0,0
    - These are object placement lines.
    - In this case we want to place object backdrop; index 0; at left-top location 0,0.
    - ** head,0,0,0 is object head index 0; at left-top location 0,0.
    - ** mouth,0,3,1 is object mouth index 0; at left-top location 3,3.
    - It'll look like the following once compiled.
- *** E
    - end of scene. no more objects will be placed

Example from above!

```
    0,1
    *
    .--.
    | oo
    | >|
    `_-/
    **
```

- Example lets say we wanted to move the mouth up and make it open (index 1)

```
    * 1
    ** backdrop,0,0,0
    ** head,0,0,0
    ** mouth,0,3,2
    *** E
```

would produce

```
    0,1
    *
    .--.
    | oo
    | O|
    `__/
    **
```

So in this case it makes life easier to build complex scenes.
Now lets talk SHORTCUTS!

###### Pre-Compiled Shortcuts ######

The Repeat Command (easiest command)

```
    * R 0,1 L 1
    *** E
```

- * R indicates this is a repeat command.
    - The first part is the from list
        - in the case of the example above it's frame 0 to frame 1
        - NOTE: it's based on frame not drawing!
    - L 1 is how many loops of this section we want to do
- *** E is the end of this command.

The Modified Command in the scene section

```
    * M 1
    ** 2,1,0,1
    *** E
```

- * M indicates this is a Modified Frame
    - the 1 is how many modification frames will be written
    - this will all make sense after I explain the ** lines.
    - This is a shortcut to do things like...panning.
- ** 1,0,0,1
    - This is a modify command. There can be multiple in a block here.
    - The first digit is the INDEX of the object we want to modify.
        - given our example above it'd be modifying the mouth.
        - indexing starts at 0
    - The second digit is the intended FRAME we want to display for that object
        - given the example above I am asking to modify the mouth to use index 0; the OPEN mouth
    - The third digit is the x modifier
        - just put 0 if you dont want to move the X relative to the current position
    - The fourth digit is the y modifier
        - just put 0 if you dont want to move the Y relative to the current position
    - *** E is the end of this command.

All of this together how I'd build an animation of a head panning

```
**** Objects
    backdrop
    *
    ** 0
        
        
        
        
    *** E
    head
    *
    ** 0
    .--.
    | oo
    | >|
    `__/
    *** E
    mouth
    *
    ** 0
    -
    ** 1
    O
    *** E
    #
    #
    #
    **** Scene
    // This is a comment. The compiler just ignores this!
    * 1
    ** backdrop,0,0,0
    ** head,0,0,0
    ** mouth,0,3,3
    *** E
    * M 1
    ** 2,1,0,0
    *** E
    // Depending on how many frames I want of talking I'd modify this!
    * R 0,1 L 5
    *** E
```